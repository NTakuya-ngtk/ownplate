<template>
  <div class="card block">
    <div class="card-content">
      <div class="media">
        <div class="media-content" @click="toEdit()">
          <h2 class="p-big" if v-if="title.name==''">
            {{$t('editTitle.empty')}}...
          </h2>
          <h2 class="p-big bold" if v-else>
            {{ title.name }}
          </h2>
        </div>
      </div>
    </div>
    <div class="card-footer">
      <a @click.prevent href="#" class="card-footer-item" @click="positionUp" v-if="position!=='first'">
        <b-icon icon="arrow-up" size="is-midium"></b-icon>
      </a>
      <a @click.prevent class="card-footer-item" v-else>
      </a>
      <a @click.prevent href="#" class="card-footer-item" @click="positionDown" v-if="position!=='last'">
        <b-icon icon="arrow-down" size="is-midium"></b-icon>
      </a>
      <a @click.prevent href="#" class="card-footer-item" v-else>
      </a>
      <a @click.prevent href="#" class="card-footer-item" @click="forkItem">
        <b-icon icon="plus" size="is-midium"></b-icon>
      </a>
      <a @click.prevent href="#" class="card-footer-item" @click="deleteItem">
        <b-icon icon="delete" size="is-midium"></b-icon>
      </a>
    </div>
  </div>
</template>

<script>
import store from "~/store/index.js";

export default {
  props: {
    title: {
      type: Object,
      required: true
    },
    position: {
      type: String,
      required: true
    }
  },
  data() {
    return {};
  },
  methods: {
    toEdit() {
      this.$emit("toEditMode", this.title.id);
    },
    positionUp() {
      this.$emit("positionUp", this.title.id);
    },
    positionDown() {
      this.$emit("positionDown", this.title.id);
    },
    forkItem() {
      this.$emit("forkItem", this.title.id);
    },
    deleteItem() {
      this.$emit("deleteItem", this.title.id);
    },
  }
};
</script>
<style lang="scss" scoped>
.card {
  margin-bottom: 0.6rem;
}
</style>
