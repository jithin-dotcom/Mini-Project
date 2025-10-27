import User from "../../models/userSchema.js";
import nodemailer from "nodemailer";
import Address from "../../models/addressSchema.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import session from "express-session";
import Order from "../../models/orderSchema.js";
import Product from "../../models/productSchema.js";
import Wallet from "../../models/walletSchema.js";
import { STATUS_CODES } from "../../constants/statusCodes.js";
import { MESSAGES } from "../../constants/messages.js";

dotenv.config();


function generateOtp(){
    const digit = "1234567890";
    let otp = "";
    for(let i = 0; i < 6; i++){
        otp += digit[Math.floor(Math.random()*10)];
    }
    return otp;
}

const sendVerificationEmail = async(email,otp)=>{
    try {
        
        const transporter = nodemailer.createTransport({
            service:"gmail",
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })

        const mailOptions = {
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Your OTP for password reset",
            text:`Your OTP is ${otp}`,
            html:`<b><h4>Your OTP:${otp}</h4><br></b>`
        }
         
        const info = await transporter.sendMail(mailOptions);
       
        return true;

    } catch (error) {
        console.error("Error sending email",error);
        return false;
    }
}


const securePassword = async(password)=>{
    try {
        
       const passwordHash = await bcrypt.hash(password,10);
       return passwordHash;

    } catch (error) {
        
    }
}



const getForgotPassPage = async(req,res)=>{
    try {
        
        res.render("forgot-password");

    } catch (error) {
        res.redirect("/pageNotFound");
    }
}


const forgotEmailValid = async(req,res)=>{
    try {
        
        const {email} = req.body;
        const findUser = await User.findOne({email:email});
       
        if(findUser){
            const otp = generateOtp();
            const emailSend = await sendVerificationEmail(email,otp);
          
            if(emailSend){
                req.session.userOtp = otp;
                req.session.email = email;
                res.render("forgotPass-otp");
                console.log("OTP:",otp);
            }else{
                res.json({success:false,message:"Failed to send OTP. Please try again"});
            }
        }else{
            res.render("forgot-password",{
                message:"User with this email does not exist"
            });
        }

    } catch (error) {
        res.redirect("/pageNotFound");
    }

}



const verifyForgotPassOtp = async(req,res)=>{
    try {
        
      const enteredOtp = req.body.otp;
      if(enteredOtp === req.session.userOtp){
       res.json({success:true,redirectUrl:"/reset-password"});
      }else{
        res.json({success:false,message:"OTP not matching"});
      }

    } catch (error) {
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({success:false,message: MESSAGES.INTERNAL_SERVER_ERROR});
    }
}


const getResetPassPage = async(req,res)=>{
    try {
        
       res.render("reset-password");

    } catch (error) {
        res.redirect("/pageNotFound");

    }
}


const resendOtp = async(req,res)=>{
    try {
        
        const otp = generateOtp();
        req.session.userOtp = otp;
        const email = req.session.email;
       
        const  emailSend = await sendVerificationEmail(email,otp);
        if(emailSend){
            console.log("Resend OTP:",otp);
            res.status(STATUS_CODES.OK).json({success:true,message:"Resend OTP Successful"});
        }
    } catch (error) {
        console.error("Error in resend oto",error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({success:false,message: STATUS_CODES.INTERNAL_SERVER_ERROR});
    }
}


const postNewPassword = async(req,res)=>{
    try {
        
        const {newPass1,newPass2} = req.body;
        const email = req.session.email;
        if(newPass1===newPass2){
            const passwordHash = await securePassword(newPass1);
            await User.updateOne(
                {email:email},
                {$set:{password:passwordHash}}
            )
           
            res.redirect("/login");  
          
        } else{
            res.render("reset-password",{message:'Passwords dont match'});

        }

    } catch (error) {
        res.redirect("/pageNotFound");
    }
}






const userProfile = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const addressData = await Address.findOne({ userId: userId });
        const orderLimit = 6;
        const orderPage = parseInt(req.query.orderPage) || 1;
        const orderSkip = (orderPage - 1) * orderLimit;
        const orderData = await Order.find({ userId: userId })
            .sort({ createdOn: -1 })
            .skip(orderSkip)
            .limit(orderLimit);

        const totalOrders = await Order.countDocuments({ userId: userId });
        const totalOrderPages = Math.ceil(totalOrders / orderLimit);

        let walletData = await Wallet.findOne({ userId: userId });
        if (!walletData) {
             walletData = await Wallet.create({
                userId: userId,
                balance: 0,
                transactionHistory: []
            });
        
        }

        const walletLimit = 5; 
        const walletPage = parseInt(req.query.walletPage) || 1;
        const walletSkip = (walletPage - 1) * walletLimit;

        const totalWalletTransactions = walletData.transactionHistory.length;
        const walletTransactions = walletData.transactionHistory
            .slice()
            .reverse()
            .slice(walletSkip, walletSkip + walletLimit);

        const totalWalletPages = Math.ceil(totalWalletTransactions / walletLimit);

        res.render('profile', {
            user: userData,
            userAddress: addressData,
            orders: orderData,
            wallet: {
                ...walletData.toObject(),
                transactionHistory: walletTransactions, 
            },
            currentOrderPage: orderPage,
            totalOrderPages: totalOrderPages,
            orderLimit: orderLimit,
            currentWalletPage: walletPage,
            totalWalletPages: totalWalletPages,
            walletLimit: walletLimit
        });
    } catch (error) {
        console.error("Error retrieving profile data:", error);
        res.redirect("/pageNotFound");
    }
};





const changeEmail = async(req,res)=>{
    try {
        res.render("change-email");
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}



const changeEmailValid = async(req,res)=>{
    try {
        
        const {email} = req.body;
      
        const userExists = await User.findOne({email});
     
        if(userExists && email == req.session.user.email){
            
            const otp = generateOtp();
            const emailSend = await sendVerificationEmail(email,otp);
            if(emailSend){
                req.session.userOtp = otp;
                req.session.userData = req.body;
                req.session.email = email;
                res.render("change-email-otp");
                
                console.log("OTP: ",otp);
            }else{
                res.json("email-error");
            }

        }else{
            res.render("change-email",{
                message : "Please Enter a valid Email "
            })
        }

    } catch (error) {
        res.redirect("/pageNotFound");
    }
}



const verifyEmailOtp = async(req,res)=>{
    try {
        
        const  enteredOtp = req.body.otp;
        if(enteredOtp===req.session.userOtp){
            req.session.userData = req.body.userData;
            res.render("new-email",{
                userData : req.session.userData,
            })
        }else{
            res.render("change-email-otp",{
                message : "OTP not matching",
                userData : req.session.userData
            })
        }

    } catch (error) {
        res.redirect("/pageNotFound");   
    }
};




const updateEmail = async(req,res)=>{
    try {
        
        const newEmail = req.body.newEmail;
        const userId = req.session.user;
        req.session.user.email = newEmail;   
        await User.findByIdAndUpdate(userId,{email:newEmail});
        res.redirect("/userProfile");

    } catch (error) {

        res.redirect("/pageNotFound");
    }
}



const changePassword = async(req,res)=>{
    try {
        res.render("change-password");
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}


const changePasswordValid = async(req,res)=>{
    try {
        
        const {email} = req.body;
        const userExists = await User.findOne({email});
        if(userExists && email == req.session.user.email){
            const otp = generateOtp();
            const emailSend = await sendVerificationEmail(email,otp);
            if(emailSend){
                req.session.userOtp = otp;
                req.session.userData = req.body;
                req.session.email = email;
                res.render("change-password-otp");
                console.log("OTP: ",otp);
            }else{
                res.json({
                    success:false,
                    message: "Failed to send OTP",
                })
            }
        }else{
            res.render("change-password",{
                message:"User with this email does not exist"
            })
        }

    } catch (error) {
        console.error("Error in changing password");
        res,redirect("/pageNotFound");
    }
}


const verifyChangePassOtp = async(req,res)=>{
    try {
        
        const enteredOtp = req.body.otp.trim();
       
        if(enteredOtp===req.session.userOtp){
            res.json({success:true,redirectUrl:"/reset-password"});
        }else{
            res.json({success:false,message:"OTP not matching"});
        }

    } catch (error) {
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({success:false,message:"An error occured during changing password"});
    }
}


const addAddress = async(req,res)=>{
    try {
        
        const user = req.session.user;
        res.render("add-address",{user:user});

    } catch (error) {
        
        res.redirect("/pageNotFound");

    }
}


const postAddAddress = async(req,res)=>{
    try {
        
        const userId = req.session.user;
        const userData = await User.findOne({_id:userId});
        const {addressType,name,city,landMark,state,pincode,phone,altPhone} = req.body;

        const userAddress = await Address.findOne({userId:userData._id});

        if(!userAddress){
            const newAddress = new Address({
               userId : userData._id,
               address : [{addressType,name,city,landMark,state,pincode,phone,altPhone}],              

            });
            await newAddress.save();
        }else{
            userAddress.address.push({addressType,name,city,landMark,state,pincode,phone,altPhone});
            await userAddress.save();
        }
        res.redirect("/userProfile");

    } catch (error) {
        
       console.error("Error adding address ",error);
       res.redirect("/pageNotFound");

    }
}



const editAddress = async(req,res)=>{
  try {
    
    const addressId = req.query.id;
    const user = req.session.user;
    const currAddress =  await Address.findOne({
        "address._id" : addressId,
    });
    if(!currAddress){
        return res.redirect("/pageNotFound");
    }

    const addressData = currAddress.address.find((item)=>{
        return item._id.toString()===addressId.toString();   
    })
    if(!addressData){
        return res.redirect("/pageNotFound");
    }

    res.render("edit-address",{address:addressData,user:user});

  } catch (error) {
    console.error("Error in edit address",error);
    res.redirect("/pageNotFound");
  }
}


const postEditAddress = async(req,res)=>{
    try {

        const data = req.body;
        const addressId = req.query.id;
        const user = req.session.user;
        const findAddress = await Address.findOne({"address._id":addressId});
        if(!findAddress){
           return res.redirect("/pageNotFound");
        }

        await Address.updateOne(
            {"address._id":addressId},
            {$set:{
                "address.$":{         
                    _id:addressId,
                    addressType:data.addressType,
                    name:data.name,
                    city:data.city,
                    landMark:data.landMark,
                    state:data.state,
                    pincode:data.pincode,
                    phone:data.phone,
                    altPhone:data.altPhone,
                }
            }}
        )
     
      res.redirect("/userProfile");
    } catch (error) {
        console.error("Error in updating Address",error);
        res.redirect("/pageNotFound");
    }
}



const deleteAddress = async (req, res) => {
    try {
        const addressId = req.query.id;
        const findAddress = await Address.findOne({ "address._id": addressId });
        if (!findAddress) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }
        await Address.updateOne(
            { "address._id": addressId },
            { $pull: { address: { _id: addressId } } }
        );
        return res.status(STATUS_CODES.OK).json({ success: true, message: "Address deleted successfully" });
    } catch (error) {
        console.error("Error in deleting address:", error);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error deleting the address" });
    }
};



const viewOrders = async(req,res)=>{

    try {
        const orderId = req.params.id;
        const userId = req.session.user._id;
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(STATUS_CODES.NOT_FOUND).render('error', { message: 'Order not found' });
        }

        const addressDoc = await Address.findOne({ userId }).exec();
        const address = addressDoc.address.find(addr => addr._id.equals(order.address));
        
        if (!address) {
            return res.status(STATUS_CODES.NOT_FOUND).send("Order address not found");
        }

        res.render('viewOrder', { order,address });
    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).render('error', { message: MESSAGES.INTERNAL_SERVER_ERROR });
    }


}





const cancelOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: "Order not found." });
    }

    if (order.status !== "Pending" && order.status !== "Shipped") {
      await session.abortTransaction();
      session.endSession();
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Order cannot be cancelled." });
    }

    
    order.status = "Cancelled";
    await order.save({ session });

  
    for (const item of order.orderedItems) {
      const product = await Product.findById(item.product).session(session);
      if (product) {
        const currentStock = product.size.get(item.size) || 0;
        product.size.set(item.size, currentStock + item.quantity);
        await product.save({ session });
      }
    }

   
    if (order.paymentMethod !== "cashOnDelivery" && order.paymentStatus !== "notCompleted") {
      let wallet = await Wallet.findOne({ userId: order.userId }).session(session);

      if (wallet) {
        wallet.balance += order.finalAmount;
        wallet.transactionHistory.push({
          transactionType: "credit",
          transactionAmount: order.finalAmount,
          description: `Refund for cancelled order ${order.orderId}`,
        });
        await wallet.save({ session });
      } else {
        wallet = new Wallet({
          userId: order.userId,
          balance: order.finalAmount,
          transactionHistory: [{
            transactionType: "credit",
            transactionAmount: order.finalAmount,
            description: `Refund for cancelled order ${order.orderId}`,
          }],
        });
        await wallet.save({ session });
      }
    }

    
    if (order.paymentStatus === "notCompleted") {
      order.paymentStatus = "completed";
      await order.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    return res.json({ success: true, message: "Order cancelled successfully." });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error cancelling order:", err);
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};




const returnOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: "Order not found." });
    }

    if (order.status !== "Delivered") {
      await session.abortTransaction();
      session.endSession();
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Order cannot be returned." });
    }

 
    order.status = "Returned";
    await order.save({ session });

   
    let wallet = await Wallet.findOne({ userId: order.userId }).session(session);

    if (wallet) {
      wallet.balance += order.finalAmount;
      wallet.transactionHistory.push({
        transactionType: "credit",
        transactionAmount: order.finalAmount,
        description: `Refund for returned order ${order.orderId}`,
      });
      await wallet.save({ session });
    } else {
      wallet = new Wallet({
        userId: order.userId,
        balance: order.finalAmount,
        transactionHistory: [{
          transactionType: "credit",
          transactionAmount: order.finalAmount,
          description: `Refund for returned order ${order.orderId}`,
        }],
      });
      await wallet.save({ session });
    }

  
    for (const item of order.orderedItems) {
      const product = await Product.findById(item.product).session(session);
      if (product) {
        const currentStock = product.size.get(item.size) || 0;
        product.size.set(item.size, currentStock + item.quantity);
        await product.save({ session });
      }
    }

    await session.commitTransaction();
    session.endSession();

    return res.json({ success: true, message: "Order returned successfully." });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error returning order:", err);
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error returning order." });
  }
};




const getOrders = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const page = parseInt(req.query.orderPage) || 1;
    const limit = 6; 
    const skip = (page - 1) * limit;
    const orders = await Order.find({ userId })
      .sort({ createdOn: -1 }) 
      .skip(skip)
      .limit(limit)
      .lean();
    const totalOrders = await Order.countDocuments({ userId });
    const totalOrderPages = Math.ceil(totalOrders / limit);
   
    return res.json({
      success: true,
      orders,
      currentOrderPage: page,
      totalOrderPages,
      orderLimit: limit
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error fetching orders." });
  }
};



const getWalletHistory = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const page = parseInt(req.query.walletPage) || 1;
    const limit = 5; 
    const skip = (page - 1) * limit;
    const wallet = await Wallet.findOne({ userId }).lean();
    if (!wallet) {
      return res.json({
        success: true,
        transactions: [],
        currentWalletPage: page,
        totalWalletPages: 0,
        walletLimit: limit
      });
    }
    const totalWalletTransactions = wallet.transactionHistory.length;
    const transactions = wallet.transactionHistory
      .slice()
      .reverse()
      .slice(skip, skip + limit);
    const totalWalletPages = Math.ceil(totalWalletTransactions / limit);
    
    return res.json({
      success: true,
      transactions,
      currentWalletPage: page,
      totalWalletPages,
      walletLimit: limit
    });
  } catch (error) {
    console.error("Error fetching wallet history:", error);
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error fetching wallet history." });
  }
};




const profileController ={
    getForgotPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    postNewPassword,
    userProfile,
    changeEmail,
    changeEmailValid,
    verifyEmailOtp,
    updateEmail,
    changePassword,
    changePasswordValid,
    verifyChangePassOtp,
    addAddress,
    postAddAddress,
    editAddress,
    postEditAddress,
    deleteAddress,
    viewOrders,
    cancelOrder,
    returnOrder,
    getOrders,
    getWalletHistory,
};


export default profileController;