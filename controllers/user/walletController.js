const { model } = require("mongoose");
const User = require("../../models/userSchema");
const Wallet = require("../../models/walletSchema");


const addMoney = async (req, res) => {
    try {
      const userId = req.session.user._id;
      const { amount } = req.body;
  
      // Find the wallet for the user
      let wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        wallet = new Wallet({ userId, balance: 0, transactionHistory: [] });
      }
  
      // Add money to the wallet
      wallet.balance += parseFloat(amount);
      wallet.transactionHistory.push({
        transactionType: 'deposit',
        transactionAmount: parseFloat(amount),
        description: 'Money added to wallet'
      });
  
      // Save the wallet
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

    // Find the wallet for the user
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    // Check the transactionHistory structure
    console.log(wallet.transactionHistory);

    // Sort the transactionHistory by transactionDate (descending order)
    const sortedHistory = wallet.transactionHistory.sort((a, b) => {
      const dateA = new Date(a.transactionDate);
      const dateB = new Date(b.transactionDate);
      
      console.log(`dateA: ${dateA}, dateB: ${dateB}`); // For debugging
      
      return dateB - dateA;
    });

    // Return sorted wallet history
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