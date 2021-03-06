<template>
  <div class="card block">
    <div class="card-content" @click="$emit('selected', order)">
      <div class="level is-mobile" style="margin:0">
        <div class="level-left" style="width:80%; overflow:hidden">
          <h3>
            <span v-if="restaurant">{{restaurant.restaurantName}}</span>
            {{ orderName }}
          </h3>
        </div>
        <div class="level-right">
          <order-status :order="order" />
        </div>
      </div>
      <div class="level is-mobile" style="margin:0">
        <div class="level-left">{{$tc('sitemenu.orderCounter', totalCount, {count: totalCount})}}</div>
        <div class="level-right">
          <span v-if="order.name">{{ order.name }}</span>
          <span v-if="!order.name && phoneNumber">{{ nationalPhoneNumber }}</span>
        </div>
      </div>
      <div class="level is-mobile" style="margin:0">
        <div class="level-left">
          <span>{{ $n(order.totalCharge, 'currency') }}</span>
          <i
            v-if="hasStripe"
            :class="'fab fa-cc-stripe stripe_'+order.payment.stripe"
            style="margin-left: 0.3em"
          ></i>
        </div>
        <div class="level-right">{{ timestamp || "0:00pm"}}</div>
      </div>
    </div>
  </div>
</template>

<script>
import OrderStatus from "~/app/admin/Order/OrderStatus";
import { nameOfOrder } from "~/plugins/strings.js";
import { parsePhoneNumber, formatNational } from "~/plugins/phoneutil.js";
import { db } from "~/plugins/firebase.js";

export default {
  components: {
    OrderStatus
  },
  data() {
    return {
      restaurant: null
    };
  },
  props: {
    order: {
      type: Object,
      required: true
    }
  },
  async created() {
    if (this.order.restaurantId) {
      const snapshot = await db
        .doc(`restaurants/${this.order.restaurantId}`)
        .get();
      this.restaurant = snapshot.data();
    }
  },
  computed: {
    hasStripe() {
      return this.order.payment && this.order.payment.stripe;
    },
    timestamp() {
      return this.$d(
        this.order.timePlaced,
        this.order.restaurantId ? "long" : "time"
      );
    },
    phoneNumber() {
      return this.order.phoneNumber && parsePhoneNumber(this.order.phoneNumber);
    },
    nationalPhoneNumber() {
      return formatNational(this.phoneNumber);
    },
    orderName() {
      return nameOfOrder(this.order);
    },
    totalCount() {
      if (this.order.order) {
        return Object.keys(this.order.order).reduce((count, id) => {
          return count + this.order.order[id];
        }, 0);
      }
      return 0;
    }
  },
  mounted() {}
};
</script>

<style scoped>
</style>
