const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const passport = require("passport");
const profileController = require("../controllers/user/profileController");
const { userAuth } = require("../middlewares/auth");
const productController = require("../controllers/user/productController");
const cartController = require("../controllers/user/cartController");
const checkoutController = require("../controllers/user/checkoutController");
const orderController = require("../controllers/user/orderController");
const wishlistController = require("../controllers/user/wishlistController");
const couponController = require("../controllers/user/couponController");
const walletController = require("../controllers/user/walletController");



router.get("/pageNotFound",userController.pageNotFound);


//signup management
router.get("/signup",userController.loadSignup);
router.post("/signup",userController.signup);
router.post("/verify-otp",userController.verifyOtp);
router.post("/resend-otp",userController.resendOtp);
router.get("/auth/google",passport.authenticate("google",{scope:["profile","email"]}));
router.get("/auth/google/callback",passport.authenticate("google",{failureRedirect:"/signup"}),(req,res)=>{
    req.session.user = req.user._id; 
    res.redirect("/");
});




//login management
router.get("/login",userController.loadLogin);
router.post("/login",userController.login);
router.get("/logout",userController.logout);


//home page and shopping
router.get("/",userController.loadHomepage);
router.get("/shop",userAuth,userController.loadShoppingPage);
router.post("/search",userAuth,userController.searchProducts);




//profile password and email management
router.get("/forgot-password",profileController.getForgotPassPage);
router.post("/forgot-email-valid",profileController.forgotEmailValid);
router.post("/verify-passForgot-otp",profileController.verifyForgotPassOtp);
router.get("/reset-password",profileController.getResetPassPage);
router.post("/resend-forgot-otp",profileController.resendOtp);
router.post("/reset-password",profileController.postNewPassword);
router.get("/userProfile",userAuth,profileController.userProfile);
router.get("/change-email",userAuth,profileController.changeEmail);
router.post("/change-email",userAuth,profileController.changeEmailValid);
router.post("/verify-email-otp",userAuth,profileController.verifyEmailOtp);
router.post("/update-email",userAuth,profileController.updateEmail);
router.get("/change-password",userAuth,profileController.changePassword);
router.post("/change-password",userAuth,profileController.changePasswordValid);
router.post("/verify-changepassword-otp",userAuth,profileController.verifyChangePassOtp);



//address management
router.get("/addAddress",userAuth,profileController.addAddress);
router.post("/addAddress",userAuth,profileController.postAddAddress);
router.get("/editAddress",userAuth,profileController.editAddress);
router.post("/editAddress",userAuth,profileController.postEditAddress);
router.get("/deleteAddress",userAuth,profileController.deleteAddress);




//product management
router.get("/productDetails",userAuth,productController.productDetails);


//cart management
router.get("/cart",userAuth,cartController.getCart);
router.post("/addToCart",userAuth,cartController.addToCart);
router.delete("/removeFromCart/:productId", userAuth,cartController.removeProduct);
router.post('/updateCartQuantity/:productId',userAuth,cartController.updateProductQuantity);



//checkout management
router.get("/checkout",userAuth,checkoutController.getCheckout);
router.post("/addAddressForOrder",userAuth,checkoutController.postAddAddress);


//order management
router.post("/placeOrder",userAuth,orderController.placeOrder);
router.post('/createRazorpayOrder',userAuth,orderController.createRazorpayOrder);
router.post('/verifyRazorpayPayment',userAuth,orderController.verifyRazorpayPayment);
router.get("/orderConfirmation",userAuth,orderController.orderDetails);
router.get ("/viewOrder/:id",userAuth,profileController.viewOrders);
router.post("/cancelOrder/:id",userAuth,profileController.cancelOrder);
router.post("/returnOrder/:id", userAuth, profileController.returnOrder);



//wishlist management
router.get("/wishlist",userAuth,wishlistController.loadWishlist);
router.post("/addToWishlist",userAuth,wishlistController.addToWishlist);
router.delete("/removeFromWishlist/:productId", userAuth, wishlistController.removeProduct);
router.post("/addToCartFromWishlist",userAuth,wishlistController.addToCart);



//coupon management
router.post("/applyCoupon",userAuth,couponController.applyCoupon);
router.delete("/deleteCoupon",userAuth,couponController.deleteCoupon)


//wallet management
router.post('/add',userAuth,walletController.addMoney);
router.get('/history',userAuth,walletController.getWalletHistory);



module.exports  = router;