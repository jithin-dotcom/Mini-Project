const mongoose = require("mongoose");


const walletSchema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', 
      required: true
    },
    balance: {
      type: Number,
      default: 0
    },
    // wallet id needed
    transactionHistory: [
      {
        transactionType: {
          type: String,
          enum: ['deposit', 'refund', 'purchase', 'wallet-to-wallet', 'manual','debit','credit'],
          required: true
        },
        transactionAmount: {
          type: Number,
          required: true
        },
        transactionDate: {
          type: Date,
          default: Date.now
        },
        description: {
          type: String,
          default: ''
        }
      }
    ],
  },{timestamps:true});
  
  
  module.exports = mongoose.model('Wallets', walletSchema);