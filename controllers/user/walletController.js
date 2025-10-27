import { model } from "mongoose";
import User from "../../models/userSchema.js";
import Wallet from "../../models/walletSchema.js";
import { STATUS_CODES } from "../../constants/statusCodes.js";
import { MESSAGES } from "../../constants/messages.js";


const addMoney = async (req, res) => {
    try {
      const userId = req.session.user._id;
      
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
  
      res.status(STATUS_CODES.OK).json({ success: true, message: 'Money added successfully' });
    } catch (error) {
      console.error('Error adding money to wallet:', error);
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
  };




const getWalletHistory = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: 'Wallet not found' });
    }
    const sortedHistory = wallet.transactionHistory.sort((a, b) => {
      const dateA = new Date(a.transactionDate);
      const dateB = new Date(b.transactionDate);
      
      
      return dateB - dateA;
    });
    res.status(STATUS_CODES.OK).json({ success: true, history: sortedHistory });
  } catch (error) {
    console.error('Error fetching wallet history:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};




const walletController ={
    addMoney,
    getWalletHistory,
};

export default walletController;