const { model } = require("mongoose");
const User = require("../../models/userSchema");
const Wallet = require("../../models/walletSchema");


const addMoney = async (req, res) => {
    try {
      const userId = req.session.user._id;
      const { amount } = req.body;
      let wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        wallet = new Wallet({ userId, balance: 0, transactionHistory: [] });
      }
      wallet.balance += parseFloat(amount);
      wallet.transactionHistory.push({
        transactionType: 'deposit',
        transactionAmount: parseFloat(amount),
        description: 'Money added to wallet'
      });
  
      await wallet.save();
  
      res.status(200).json({ success: true, message: 'Money added successfully' });
    } catch (error) {
      console.error('Error adding money to wallet:', error);
      res.status(500).json({ success: false, message: 'An error occurred. Please try again later.' });
    }
  };





const getWalletHistory = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }
    const sortedHistory = wallet.transactionHistory.sort((a, b) => {
      const dateA = new Date(a.transactionDate);
      const dateB = new Date(b.transactionDate);
      
      console.log(`dateA: ${dateA}, dateB: ${dateB}`); 
      
      return dateB - dateA;
    });
    res.status(200).json({ success: true, history: sortedHistory });
  } catch (error) {
    console.error('Error fetching wallet history:', error);
    res.status(500).json({ success: false, message: 'An error occurred. Please try again later.' });
  }
};






  module.exports = {
    addMoney,
    getWalletHistory,
  }