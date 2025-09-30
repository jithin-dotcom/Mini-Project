
import express from "express";
import userController from "../controllers/user/userController.js";
import passport from "passport";
import profileController from "../controllers/user/profileController.js";
import { userAuth } from "../middlewares/auth.js";
import productController from "../controllers/user/productController.js";
import cartController from "../controllers/user/cartController.js";
import checkoutController from "../controllers/user/checkoutController.js";
import orderController from "../controllers/user/orderController.js";
import wishlistController from "../controllers/user/wishlistController.js";
import couponController from "../controllers/user/couponController.js";
import walletController from "../controllers/user/walletController.js";


const router = express.Router();




router.get("/pageNotFound",userController.pageNotFound);



router.get("/signup",userController.loadSignup);
router.post("/signup",userController.signup);
router.post("/verify-otp",userController.verifyOtp);
router.post("/resend-otp",userController.resendOtp);
router.get("/auth/google",passport.authenticate("google",{scope:["profile","email"]}));
router.get("/auth/google/callback",passport.authenticate("google",{failureRedirect:"/signup"}),(req,res)=>{
    req.session.user = req.user;
    res.redirect("/");
});





router.get("/login",userController.loadLogin);
router.post("/login",userController.login);
router.post("/logout",userController.logout);
router.get("/logout",userController.getLogout);



router.get("/",userController.loadHomepage);
router.get("/shop",userAuth,userController.loadShoppingPage);
router.post("/search",userAuth,userController.searchProducts);
router.get("/filter", userAuth, userController.filterProducts);





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




router.get("/addAddress",userAuth,profileController.addAddress);
router.post("/addAddress",userAuth,profileController.postAddAddress);
router.get("/editAddress",userAuth,profileController.editAddress);
router.post("/editAddress",userAuth,profileController.postEditAddress);
router.delete("/deleteAddress",userAuth,profileController.deleteAddress);





router.get("/productDetails",userAuth,productController.productDetails);



router.get("/cart",userAuth,cartController.getCart);
router.post("/addToCart",userAuth,cartController.addToCart);
router.delete("/removeFromCart/:productId", userAuth,cartController.removeProduct);
router.post('/updateCartQuantity/:productId',userAuth,cartController.updateProductQuantity);
router.get("/cart/data", userAuth, cartController.getCartData);



router.get("/checkout",userAuth,checkoutController.getCheckout);
router.post("/addAddressForOrder",userAuth,checkoutController.postAddAddress);



router.post("/placeOrder",userAuth,orderController.placeOrder);
router.post('/createRazorpayOrder',userAuth,orderController.createRazorpayOrder);
router.post('/verifyRazorpayPayment',userAuth,orderController.verifyRazorpayPayment);
router.get("/orderConfirmation",userAuth,orderController.orderDetails);
router.get ("/viewOrder/:id",userAuth,profileController.viewOrders);
router.post("/cancelOrder/:id",userAuth,profileController.cancelOrder);
router.post("/returnOrder/:id", userAuth, profileController.returnOrder);

router.get("/getOrders", userAuth, profileController.getOrders);
router.get("/getWalletHistory", userAuth, profileController.getWalletHistory);




router.get("/wishlist",userAuth,wishlistController.loadWishlist);
router.post("/addToWishlist",userAuth,wishlistController.addToWishlist);
router.delete("/removeFromWishlist/:productId", userAuth, wishlistController.removeProduct);
router.post("/addToCartFromWishlist",userAuth,wishlistController.addToCart);

router.get("/wishlist/data", userAuth, wishlistController.getWishlistData);



router.post("/applyCoupon",userAuth,couponController.applyCoupon);
router.delete("/deleteCoupon",userAuth,couponController.deleteCoupon)



router.post('/add',userAuth,walletController.addMoney);
router.get('/history',userAuth,walletController.getWalletHistory);


export default router;