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





  // const getWalletHistory = async (req, res) => {
  //   try {
  //     const userId = req.session.user._id;
  //     const { page = 1, limit = 10} = req.query; // Default to page 1 and 10 items per page
  
  //     // Find the wallet for the user
  //     const wallet = await Wallet.findOne({ userId });
  //     if (!wallet) {
  //       return res.status(404).render('error', { message: 'Wallet not found' });
  //     }
  
  //     // Paginate the transaction history
  //     const startIndex = (page - 1) * limit;
  //     const paginatedHistory = wallet.transactionHistory.slice(startIndex, startIndex + limit);
  
  //     res.render('wallet-history', {
  //       history: paginatedHistory,
  //       totalItems: wallet.transactionHistory.length,
  //       totalPages: Math.ceil(wallet.transactionHistory.length / limit),
  //       currentPage: parseInt(page)
  //     });
  //   } catch (error) {
  //     console.error('Error fetching wallet history:', error);
  //     res.status(500).render('error', { message: 'An error occurred. Please try again later.' });
  //   }
  // };
  





//get wallet history new 

  // const getWalletHistory = async (req, res) => {
  //   try {
  //     const userId = req.session.user._id;
  
  //     // Find the wallet for the user
  //     const wallet = await Wallet.findOne({ userId });
  //     if (!wallet) {
  //       return res.status(404).json({ success: false, message: 'Wallet not found' });
  //     }
  
  //     res.status(200).json({ success: true, history: wallet.transactionHistory });
  //   } catch (error) {
  //     console.error('Error fetching wallet history:', error);
  //     res.status(500).json({ success: false, message: 'An error occurred. Please try again later.' });
  //   }
  // };



  // const getWalletHistory = async (req, res) => {
  //   try {
  //     const userId = req.session.user._id;
  
  //     // Use aggregation to sort the transactionHistory by transactionDate in descending order
  //     const wallet = await Wallet.aggregate([
  //       { $match: { userId: mongoose.Types.ObjectId(userId) } },
  //       {
  //         $project: {
  //           transactionHistory: {
  //             $sortArray: {
  //               input: "$transactionHistory",
  //               sortBy: { transactionDate: -1 }
  //             }
  //           }
  //         }
  //       }
  //     ]);
  
  //     if (!wallet || wallet.length === 0) {
  //       return res.status(404).json({ success: false, message: 'Wallet not found' });
  //     }
  
  //     res.status(200).json({ success: true, history: wallet[0].transactionHistory });
  //   } catch (error) {
  //     console.error('Error fetching wallet history:', error);
  //     res.status(500).json({ success: false, message: 'An error occurred. Please try again later.' });
  //   }
  // };
  
  


//   const getWalletHistory = async (req, res) => {
//     try {
//       const userId = req.session.user._id;
  
//       // Find the wallet for the user
//       const wallet = await Wallet.findOne({ userId });
//       if (!wallet) {
//         return res.status(404).json({ success: false, message: 'Wallet not found' });
//       }
  
//       // Sort the transactionHistory by transactionDate (descending order)
//       const sortedHistory = wallet.transactionHistory.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
  
//       res.status(200).json({ success: true, history: sortedHistory });
//     } catch (error) {
//       console.error('Error fetching wallet history:', error);
//       res.status(500).json({ success: false, message: 'An error occurred. Please try again later.' });
//     }
// };





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