import express from "express";
import adminController from "../controllers/admin/adminController.js";
import customerController from "../controllers/admin/customerController.js";
import categoryController from "../controllers/admin/categoryController.js";
import brandController from "../controllers/admin/brandController.js";
import productController from "../controllers/admin/productController.js";
import orderController from "../controllers/admin/orderController.js";
import couponController from "../controllers/admin/couponController.js";
import profileController from "../controllers/user/profileController.js";
import dashboardController from "../controllers/admin/dashboardController.js";

import { userAuth, adminAuth } from "../middlewares/auth.js";

const router = express.Router();



import multer from "multer";
import storage from "../helpers/multer.js";
const uploads = multer({storage:storage});


router.get("/pageerror",adminController.pageerror);
router.get("/login",adminController.loadLogin);
router.post("/login",adminController.login);
router.get("/logout",adminController.logout);






router.get("/users",adminAuth,customerController.customerInfo);
router.post("/blockCustomer",adminAuth,customerController.customerBlocked);
router.post("/unblockCustomer",adminAuth,customerController.customerunBlocked);
router.get("/users/data", adminAuth, customerController.customerInfoAjax);






router.get("/category",adminAuth,categoryController.categoryInfo);
router.post("/addCategory",adminAuth,categoryController.addCategory);
router.post("/addCategoryOffer",adminAuth,categoryController.addCategoryOffer);
router.post("/removeCategoryOffer",adminAuth,categoryController.removeCategoryOffer);
router.get("/editCategory",adminAuth,categoryController.getEditCategory);
router.post("/editCategory/:id",adminAuth,categoryController.editCategory);


router.get("/category/data", adminAuth, categoryController.categoryInfoAjax);
router.post("/listCategory", adminAuth, categoryController.listCategory);
router.post("/unlistCategory", adminAuth, categoryController.unlistCategory);



router.get("/brands",adminAuth,brandController.getBrandPage);
router.post("/addBrand",adminAuth,uploads.single("image"),brandController.addBrand); 
router.post("/deleteBrand", adminAuth, brandController.deleteBrand);
router.get("/brands/data", adminAuth, brandController.getBrandPageAjax);
router.post("/blockBrand", adminAuth, brandController.blockBrand);
router.post("/unBlockBrand", adminAuth, brandController.unBlockBrand);






router.get("/addProducts",adminAuth,productController.getProductAddPage);
router.post("/addProducts",adminAuth,uploads.array("images",4),productController.addProducts);
router.get("/products",adminAuth,productController.getAllProducts);
router.get("/editProduct",adminAuth,productController.getEditProduct);
router.post("/editProduct/:id",adminAuth,uploads.array("images",4),productController.editProduct);
router.post("/deleteImage",adminAuth,productController.deleteSingleImage);
router.get("/products/data", adminAuth, productController.getProductsData);
router.post("/addProductOffer", adminAuth, productController.addProductOffer);
router.post("/removeProductOffer", adminAuth, productController.removeProductOffer);
router.post("/blockProduct", adminAuth, productController.blockProduct);
router.post("/unblockProduct", adminAuth, productController.unblockProduct);





router.get("/orderList",adminAuth,orderController.getAllOrders);
router.post("/orders/:id/status",adminAuth,orderController.updateOrderStatus);
router.post("/orders/:id/cancel",adminAuth,orderController.cancelOrder);
router.post("/orders/:id/delete",adminAuth,orderController.deleteOrder);
router.get ("/seeOrder/:id",adminAuth,orderController.seeOrders);
router.get("/orders/data", adminAuth, orderController.getOrdersData);



router.get("/coupon",adminAuth,couponController.loadCoupon);
router.post("/createCoupon",adminAuth,couponController.createCoupon);
router.get("/editCoupon",adminAuth,couponController.editCoupon);
router.post("/updateCoupon",adminAuth,couponController.updateCoupon);
router.delete("/deleteCoupon", adminAuth, couponController.deleteCoupon);
router.get("/coupon/data", adminAuth, couponController.getCouponsData);


 

router.get("/",adminAuth,dashboardController.loadDashboardMain);
router.post("/dashboardMain",adminAuth,dashboardController.dashboardMain);
router.get("/dashBoardMain/download/pdf",adminAuth,dashboardController.generatePdfReportMain);
router.get("/dashBoardMain/download/excel",adminAuth,dashboardController.generateExcelReportMain);


export default router;
