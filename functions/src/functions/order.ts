import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin';
import * as utils from '../stripe/utils'
import { order_status } from '../common/constant'
import * as sms from './sms'
import { resources } from './resources'
import i18next from 'i18next'
import Order from '../models/Order'

// This function is called by users to place orders without paying
export const place = async (db: FirebaseFirestore.Firestore, data: any, context: functions.https.CallableContext) => {
  const uid = utils.validate_auth(context);
  const { restaurantId, orderId, tip, sendSMS } = data;
  utils.validate_params({ restaurantId, orderId }) // tip and sendSMS are optinoal

  try {
    const orderRef = db.doc(`restaurants/${restaurantId}/orders/${orderId}`)

    return await db.runTransaction(async transaction => {
      const order = Order.fromSnapshot<Order>(await transaction.get(orderRef))
      if (!order) {
        throw new functions.https.HttpsError('invalid-argument', 'This order does not exist.')
      }
      if (uid !== order.uid) {
        throw new functions.https.HttpsError('permission-denied', 'The user is not the owner of this order.')
      }
      if (order.status !== order_status.validation_ok) {
        throw new functions.https.HttpsError('failed-precondition', 'The order has been already placed or canceled')
      }
      const multiple = utils.getStripeRegion().multiple; // 100 for USD, 1 for JPY
      const roundedTip = Math.round(tip * multiple) / multiple

      transaction.update(orderRef, {
        status: order_status.order_placed,
        totalCharge: order.total + tip,
        tip: roundedTip,
        sendSMS: sendSMS || false,
        timePlaced: admin.firestore.FieldValue.serverTimestamp()
      })

      return { success: true }
    })
  } catch (error) {
    throw utils.process_error(error)
  }
}

// This function is called by admins (restaurant operators) to update the status of order
export const update = async (db: FirebaseFirestore.Firestore, data: any, context: functions.https.CallableContext) => {
  const uid = utils.validate_auth(context);
  const { restaurantId, orderId, status, lng } = data;
  utils.validate_params({ restaurantId, orderId, status }) // lng is optional

  try {
    const restaurantDoc = await db.doc(`restaurants/${restaurantId}`).get()
    const restaurant = restaurantDoc.data() || {}
    if (restaurant.uid !== uid) {
      throw new functions.https.HttpsError('permission-denied', 'The user does not have an authority to perform this operation.')
    }

    const orderRef = db.doc(`restaurants/${restaurantId}/orders/${orderId}`)
    let phoneNumber: string | undefined = undefined;
    let msgKey: string | undefined = undefined;
    let orderNumber: string = "";
    let sendSMS: boolean = false;

    const result = await db.runTransaction(async transaction => {
      const order = Order.fromSnapshot<Order>(await transaction.get(orderRef))
      if (!order) {
        throw new functions.https.HttpsError('invalid-argument', 'This order does not exist.')
      }
      phoneNumber = order.phoneNumber
      orderNumber = "#" + `00${order.number}`.slice(-3)
      sendSMS = order.sendSMS

      const isPreviousStateChangable: Boolean = (() => {
        switch (order.status) {
          case order_status.order_placed:
          case order_status.order_accepted:
          case order_status.cooking_completed:
            return true
        }
        return false
      })();
      if (!isPreviousStateChangable) {
        throw new functions.https.HttpsError('failed-precondition', 'It is not possible to change state from the current state.', order.status)
      }

      const isNewStatusValid: Boolean = (() => {
        switch (status) {
          //case order_status.order_canceled:    call stripeCancelIntent instead
          case order_status.order_accepted:
            if (status > order.status) {
              msgKey = "msg_order_accepted"
            }
            return true
          case order_status.cooking_completed:
            msgKey = "msg_cooking_completed"
            return true
          case order_status.customer_picked_up:
            return !(order.payment && order.payment.stripe) // only "unpaid" order can be manually completed
        }
        return false
      })();
      if (!isNewStatusValid) {
        throw new functions.https.HttpsError('permission-denied', 'The user does not have an authority to perform this operation.', status)
      }

      if (status === order_status.order_canceled && order.payment && order.payment.stripe) {
        throw new functions.https.HttpsError('permission-denied', 'Paid order can not be cancele like this', status)
      }

      transaction.update(orderRef, {
        status
      })
      return { success: true }
    })
    if (sendSMS && msgKey) {
      const t = await i18next.init({
        lng: lng || utils.getStripeRegion().langs[0],
        resources
      })
      await sms.pushSMS("OwnPlate", `${t(msgKey)} ${restaurant.restaurantName} ${orderNumber}`, phoneNumber)
    }
    return result
  } catch (error) {
    throw utils.process_error(error)
  }
}
