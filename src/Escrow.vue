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
  div Escrow contract ABI:&nbsp;
    a(
      href="VestingEscrowSimple.json",
      target="_blank"
    ) 📄ABI
  div.spacer
  div YFI Price: {{ yfi_price | toCurrency }}
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
  div Unclaimed: {{ unclaimed | fromWei }} YFI
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
    div Cliff is not over yet. Come back later 🤑
  div.spacer
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
  div.red(v-if="error")
    span {{ error }}
div(v-else)
  div.notFound
    p You are not part of the Citadel, yet
    p But you can be! Check out the 
    | 
    a.blue(href="https://docs.yearn.finance/contributors/contributors") Contributors Guide
    p 🚀
  div.muted Active Account: {{ activeAccount }}
</template>

<script>

import {ethers} from "ethers";
import axios from "axios";
import { mapGetters } from "vuex";
import moment from 'moment';
import escrowList from './escrows.js'
import VestingEscrowSimple from './abi/VestingEscrowSimple.json';
import ProgressBar from './components/ProgressBar';
import Web3 from "web3";
const web3 = new Web3(Web3.givenProvider);
const ERROR_CLIFF_NOT_OVER = "Cliff is not over. You have to wait 😓";
const ERROR_NEGATIVE_ALL = "You have to claim more than 0 🤓";

export default {
  name: "Escrow",
  components: {
    ProgressBar,
  },
  data() {
    return {
      is_contributor: false,
      chainTime: 0,
      username: null,
      amount: 0,
      error: null,
      yfi_price: 0,
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
      if (!this.is_cliff_over) {
        this.error = ERROR_CLIFF_NOT_OVER;
        return;
      }

      const escrowDrizzle = this.drizzleInstance.contracts["Escrow"];
      const provider = new ethers.providers.Web3Provider(escrowDrizzle.currentProvider);
    	const	signer = provider.getSigner();
      const escrow = new ethers.Contract(escrowDrizzle.address, ['function claim(address, uint256)'], signer);
      escrow.claim(
        this.activeAccount,
        ethers.utils.parseUnits(this.amount.toString(), this.vault_decimals),
        {type: 2}
      ).catch(e => this.error = (e.message || 'error'));
    },
    on_claim_all() {
      this.error = null;
      
      if (this.unclaimed <= 0) {
        this.error = ERROR_NEGATIVE_ALL;
        return;
      }
      if (!this.is_cliff_over) {
        this.error = ERROR_CLIFF_NOT_OVER;
        return;
      }

      const escrowDrizzle = this.drizzleInstance.contracts["Escrow"];
      const provider = new ethers.providers.Web3Provider(escrowDrizzle.currentProvider);
    	const	signer = provider.getSigner();
      const escrow = new ethers.Contract(escrowDrizzle.address, ['function claim()'], signer);
      escrow.claim({type: 2}).catch(e => this.error = (e.message || 'error'));
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
          return ethers.BigNumber.from(value);
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
      return web3.utils.toChecksumAddress(this.activeAccount);
    },
    escrow_address() {
        return escrowList[this.user].ESCROW;
    },
    cliff_length() {
      return this.call("Escrow", "cliff_length", []);
    },
    start_time() {
      return this.call("Escrow", "start_time", []);
    },
    cliff_time() {
      if (!this.start_time.isZero()) {
        const now = moment.unix(this.chainTime);
        const cliff_end = moment.unix(this.start_time).add(this.cliff_length, 'seconds');
        let   prefix = "ends ";

        if (cliff_end.diff(now) < 0) {
          prefix = "ended ";
        }
        return prefix + moment.unix(this.start_time).add(this.cliff_length, 'seconds').from(now);
      };
      return ('');
    },
    unlock_progress() {
        const now = moment.unix(this.chainTime);
        const start = moment.unix(this.start_time);
        const end = moment.unix(this.end_time);
        const total_duration = end.diff(start);
        const duration = now.diff(start);

        return (this.end_time == 0 || this.start_time == 0) ? 0 : duration / total_duration;
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
        const now = moment.unix(this.chainTime);
        return moment.unix(this.start_time).add(this.cliff_length, 'seconds').diff(now) <= 0;
    },
  },
  async created() {
    //Active account is defined?
    if (this.activeAccount !== undefined) {
    const {timestamp} = await web3.eth.getBlock()
    this.chainTime = timestamp;

        this.load_reverse_ens();
        const escrowAddress = escrowList[this.user];
        
        if (escrowAddress !== undefined) this.is_contributor = true;

        this.drizzleInstance.addContract(
            {
                contractName: 'Escrow',
                web3Contract: new web3.eth.Contract(VestingEscrowSimple, escrowAddress.ESCROW)
            }
        );

      axios
      .get(
        "https://api.coingecko.com/api/v3/simple/price?ids=yearn-finance&vs_currencies=usd"
      )
      .then((response) => {
        this.yfi_price = response.data['yearn-finance'].usd;
      });
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
	width: 900px;
	height: 200px;
	margin: auto;
  text-align: center;
  font-size: 3em;
}
</style>
