<template>
  <div>
    <v-divider />
    <v-row>
      <v-col style="padding-bottom: 0">
        <h3 style="text-align: center">5thIndustry</h3>
        <v-subheader style="justify-content: center; height: initial">
          <slot name="type"></slot>
        </v-subheader>
      </v-col>
    </v-row>
    <slot name="content"></slot>
    <v-divider />
  </div>
</template>
<script>
export default {
  name: 'layout-5thindustry',
};
</script>
