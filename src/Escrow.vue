<template lang="pug">
#escrow(v-if="isDrizzleInitialized && is_contributor")
  .logo 🔵 🏰
  h1.title.is-3 Welcome Ser
  div You are part of the <span class="blue">blue</span> Citadel
  div.spacer
  div Escrow contract:&nbsp;
    a(
      :href="'https://etherscan.io/address/' + escrow_address + '#code'",
      target="_blank"
    ) 📃Contract
  div.spacer
  div <strong>Cliff {{ cliff_time }} </strong>
  div Start time: {{ start_time | fromUnix }}
  div End time: {{ end_time | fromUnix }}
  div Total locked: {{ total_locked | fromWei }} YFI
  div.spacer
  div Vesting Progress:
  progress-bar(:progress="unlock_progress" :width="50")
  div.spacer
  div <strong>Your address: {{ activeAccount }} </strong>
  div Remaining Locked {{ remaining_locked | fromWei }} YFI
  div Claimed: {{ total_claimed | fromWei }} YFI
  div Uncaimed: {{ unclaimed | fromWei }} YFI
  div.spacer
  div(v-if="is_cliff_over",)
    b-field(label="Amount", custom-class="is-small")
        b-input(v-model.number="amount", size="is-small", type="number",min=0, step=0.01)
        p.control
          b-button.is-static(size="is-small") YFI
    div.spacer
    button.unstyled(
          @click.prevent="on_claim"
          ) 💰 Claim
    button.unstyled(
        @click.prevent="on_claim_all"
      ) 💰 Claim All
  div(v-else)
    div Cliff is not over yet. Come back later 📅
  div.spacer
    .muted
      span Made with 💙
      | 
      span - Contracts:
      | 
      a(href="https://twitter.com/bantg", target="_blank") bantg
      | 
      span - UI:
      | 
      a(href="https://twitter.com/fameal", target="_blank") fameal
div(v-else)
  div.notFound
    p You are not on the list
    p 😵
  div Account: {{ activeAccount }}
</template>

<script>

import ethers from "ethers";
import { mapGetters } from "vuex";
import moment from 'moment';
import escrowList from './escrows.js'
import VestingEscrowSimple from './abi/VestingEscrowSimple.json';
import ProgressBar from './components/ProgressBar';

import Web3 from "web3";

let web3 = new Web3(Web3.givenProvider);

const max_uint = new ethers.BigNumber.from(2).pow(256).sub(1).toString();
const BN_ZERO = new ethers.BigNumber.from(0);
const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

const ERROR_CLIFF_NOT_OVER = "Cliff is not over. You have to wait.";

export default {
  name: "Escrow",
  components: {
    ProgressBar,
  },
  data() {
    return {
      username: null,
      amount: 0,
      error: null,
    };
  },
  filters: {
    fromWei(data, precision, decimals) {
      if (decimals === undefined) decimals = 18;
      if (data === "loading") return data;
      if (data > 2 ** 255) return "♾️";
      let value = ethers.utils.commify(ethers.utils.formatUnits(data, decimals));
      let parts = value.split(".");

      if (precision === 0) return parts[0];

      return parts[0] + "." + parts[1].slice(0, precision);
    },
    toPct(data, precision) {
      if (isNaN(data)) return "-";
      return `${(data * 100).toFixed(precision)}%`;
    },
    toCurrency(data, precision) {
      if ( !data ) return "-";
      
      if (typeof data !== "number") {
        data = parseFloat(data);
      }
      var formatter = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: precision,
      });
      return formatter.format(data);
    },
    fromUnix(data) {
            return moment.unix(data).format('MMMM Do YYYY, HH:mm:ss');
    },
    fromSeconds(data) {
            return moment(data).format('MMMM Do YYYY, HH:mm:ss');
    }
  },
  methods: {
    on_claim() {
      this.error = null;

      if (this.is_cliff_over) {
        this.error = ERROR_CLIFF_NOT_OVER;
        return;
      }

      this.drizzleInstance.contracts["Escrow"].methods["claim"].cacheSend(
        ethers.utils.parseUnits(this.amount.toString(), this.vault_decimals).toString(),
        {
          from: this.activeAccount,
        }
      );
    },
    on_claim_all() {
      this.error = null;

      if (this.is_cliff_over) {
        this.error = ERROR_CLIFF_NOT_OVER;
        return;
      }

      this.drizzleInstance.contracts["Escrow"].methods["claim"].cacheSend(
        {
          from: this.activeAccount,
        }
      );
    },
    async load_reverse_ens() {
      let lookup = this.activeAccount.toLowerCase().substr(2) + ".addr.reverse";
      let resolver = await this.drizzleInstance.web3.eth.ens.resolver(lookup);
      let namehash = ethers.utils.namehash(lookup);
      this.username = await resolver.methods.name(namehash).call();
    },
    call(contract, method, args, out = "number") {
      let key = this.drizzleInstance.contracts[contract].methods[
        method
      ].cacheCall(...args);
      let value;
      try {
        value = this.contractInstances[contract][method][key].value;
      } catch (error) {
        value = null;
      }
      switch (out) {
        case "number":
          if (value === null) value = 0;
          return new ethers.BigNumber.from(value);
        case "address":
          return value;
        default:
          return value;
      }
    },
  },
  computed: {
    ...mapGetters("accounts", ["activeAccount", "activeBalance"]),
    ...mapGetters("drizzle", ["drizzleInstance", "isDrizzleInitialized"]),
    ...mapGetters("contracts", ["getContractData", "contractInstances"]),

    user() {
      return this.activeAccount;
    },
    escrow_address() {
        return escrowList[this.activeAccount.toLowerCase()].ESCROW;
    },
    cliff_length() {
      return this.call("Escrow", "cliff_length", []);
    },
    start_time() {
      return this.call("Escrow", "start_time", []);
    },
    cliff_time() {
        let now = moment(new Date());
        let cliff_end = moment.unix(this.start_time).add(this.cliff_length, 'seconds');
        let prefix;

        if (cliff_end.diff(now) < 0) {
          prefix = "ended ";
        } else {
          prefix = "ends "
        }

        return prefix + moment.unix(this.start_time).add(this.cliff_length, 'seconds').fromNow();
    },
    unlock_progress() {
        let now = moment(new Date());
        let start = moment.unix(this.start_time);
        let end = moment.unix(this.end_time);
        
        let total_duration = end.diff(start);
        let duration = now.diff(start);

        return (this.end_time == 0 || this.start_time == 0)?0:duration/total_duration;
    },
    end_time() {
      return this.call("Escrow", "end_time", []);
    },
    total_locked() {
      return this.call("Escrow", "total_locked", []);
    },
    total_claimed() {
      return this.call("Escrow", "total_claimed", []);
    },
    unclaimed() {
      return this.call("Escrow", "unclaimed", []);
    },
    remaining_locked() {
      return this.total_locked.sub(this.total_claimed).sub(this.unclaimed);
    },
    is_cliff_over() {
        let now = moment(new Date());
        return  moment.unix(this.start_time).add(this.cliff_length, 'seconds').diff(now) <= 0;
    },
  },
  async created() {
    let escrowAddress;
    
    //Active account is defined?
    if (this.activeAccount !== undefined) {
        this.load_reverse_ens();
        escrowAddress = escrowList[this.activeAccount.toLowerCase()];
        
        if (escrowList[this.activeAccount.toLowerCase()] !== undefined) this.is_contributor = true;

        this.drizzleInstance.addContract(
            {
                contractName: 'Escrow',
                web3Contract: new web3.eth.Contract(VestingEscrowSimple, escrowList[this.activeAccount.toLowerCase()].ESCROW)
            }
        );
    }

  },
};
</script>

<style>
input {
  height: 26px;
}
.muted {
  color: gray;
  font-size: 0.8em;
}
.muted a {
  text-decoration: underline;
}
.red {
  color: red;
  font-weight: 700;
}
.blue {
  color: blue;
  font-weight: 700;
}
.spacer {
  padding-top: 1em;
  padding-bottom: 1em;
}
a,
a:visited,
a:hover {
  color: gray;
}
div.notFound {
	width: 800px;
	height: 200px;
	margin: auto;
  text-align: center;
  font-size: 3em;
}
</style>
