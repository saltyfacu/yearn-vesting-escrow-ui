<template lang="pug">
  div(v-if="isDrizzleInitialized", id="app")
    .section
      Escrow
  div(v-else)
    div Loading yVesting UI 🐇...
</template>

<script>
import Escrow from './Escrow'
import { mapGetters } from 'vuex'

export default {
  name: 'app',
  components: {
    Escrow,
  },
  computed: mapGetters('drizzle', ['isDrizzleInitialized'])
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;700&display=swap');

#app {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.8rem;
  font-weight: 500;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: left;
  color: #2c3e50;
  margin-top: 0px;
}
.section {
  padding: 1rem !important;
}
body, button, input, optgroup, select, textarea {
  font-family: 'IBM Plex Mono', monospace !important;
}

.control .unstyled {
  margin-left: 0.5em;
}

button.unstyled {
  margin-right: 0.5em;
  height: 2.5em;
  line-height: 1.5;
  font-size: 0.75rem
}

.logo {
  font-size: 80px;
}

.column {
  float: left;
  width: 40%;
}

.column-sm {
  float: left;
  width: 25%;
  margin-right: 1%;
}

.warning {
  font-size: 13px;
}

.row:after {
  content: "";
  display: table;
  clear: both;
}
</style>
