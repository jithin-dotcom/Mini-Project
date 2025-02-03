const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const brandController = require("../controllers/admin/brandController");
const productController = require("../controllers/admin/productController"); 
const bannerController = require("../controllers/admin/bannerController");
const orderController = require("../controllers/admin/orderController");
const couponController = require("../controllers/admin/couponController");
const salesController = require("../controllers/admin/salesController");
const profileController = require("../controllers/user/profileController");
const dashboardController = require("../controllers/admin/dashboardController");


const {userAuth,adminAuth} = require("../middlewares/auth");
const multer = require("multer");
const storage = require("../helpers/multer");
const uploads = multer({storage:storage});

//admin authentication
router.get("/pageerror",adminController.pageerror);
router.get("/login",adminController.loadLogin);
router.post("/login",adminController.login);
// router.get("/",adminAuth,adminController.loadDashboard);


// user management
router.get("/logout",adminController.logout);
router.get("/users",adminAuth,customerController.customerInfo);
router.get("/blockCustomer",adminAuth,customerController.customerBlocked);
router.get("/unblockCustomer",adminAuth,customerController.customerunBlocked);



//category management
router.get("/category",adminAuth,categoryController.categoryInfo);
router.post("/addCategory",adminAuth,categoryController.addCategory);
router.post("/addCategoryOffer",adminAuth,categoryController.addCategoryOffer);
router.post("/removeCategoryOffer",adminAuth,categoryController.removeCategoryOffer);
router.get("/listCategory",adminAuth,categoryController.getListCategory);
router.get("/unlistCategory",adminAuth,categoryController.getUnlistCategory);
router.get("/editCategory",adminAuth,categoryController.getEditCategory);
router.post("/editCategory/:id",adminAuth,categoryController.editCategory);



//brand management
router.get("/brands",adminAuth,brandController.getBrandPage);
router.post("/addBrand",adminAuth,uploads.single("image"),brandController.addBrand); //use array in place of image in case of multiple images
router.get("/blockBrand",adminAuth,brandController.blockBrand);
router.get("/unBlockBrand",adminAuth,brandController.unBlockBrand);
router.delete("/deleteBrand",adminAuth,brandController.deleteBrand);


//product management
router.get("/addProducts",adminAuth,productController.getProductAddPage);
router.post("/addProducts",adminAuth,uploads.array("images",4),productController.addProducts);
router.get("/products",adminAuth,productController.getAllProducts);
router.post("/addProductOffer",adminAuth,productController.addProductOffer);
router.post("/removeProductOffer",adminAuth,productController.removeProductOffer);
router.get("/blockProduct",adminAuth,productController.blockProduct);
router.get("/unblockProduct",adminAuth,productController.unblockProduct);
router.get("/editProduct",adminAuth,productController.getEditProduct);
router.post("/editProduct/:id",adminAuth,uploads.array("images",4),productController.editProduct);
router.post("/deleteImage",adminAuth,productController.deleteSingleImage);

//banner management
router.get("/banner",adminAuth,bannerController.getBannerPage);
router.get("/addBanner",adminAuth,bannerController.getAddBannerPage);
router.post("/addBanner",adminAuth,uploads.single("images"),bannerController.addBanner);

// order management
router.get("/orderList",adminAuth,orderController.getAllOrders);
router.post("/orders/:id/status",adminAuth,orderController.updateOrderStatus);
router.post("/orders/:id/cancel",adminAuth,orderController.cancelOrder);
router.post("/orders/:id/delete",adminAuth,orderController.deleteOrder);
router.get ("/seeOrder/:id",adminAuth,orderController.seeOrders);


//coupon management
router.get("/coupon",adminAuth,couponController.loadCoupon);
router.post("/createCoupon",adminAuth,couponController.createCoupon);
router.get("/editCoupon",adminAuth,couponController.editCoupon);
router.post("/updateCoupon",adminAuth,couponController.updateCoupon);
router.get("/deleteCoupon",adminAuth,couponController.deleteCoupon);



 //salesreport management

// router.get("/loadDashboard",adminAuth,salesController.loadDashboard);
// router.post("/dashboard",adminAuth,salesController.dashboard);
// router.get("/dashBoard/download/pdf",adminAuth,salesController.generatePdfReport);
// router.get("/dashBoard/download/excel",adminAuth,salesController.generateExcelReport);

router.get("/",adminAuth,dashboardController.loadDashboardMain);
router.post("/dashboardMain",adminAuth,dashboardController.dashboardMain);
router.get("/dashBoardMain/download/pdf",adminAuth,dashboardController.generatePdfReportMain);
router.get("/dashBoardMain/download/excel",adminAuth,dashboardController.generateExcelReportMain);


module.exports = router;