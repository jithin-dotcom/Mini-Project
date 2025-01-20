const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const Size = require("../../models/sizeSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");


const getProductAddPage = async(req,res)=>{
    try {
        
       const category = await Category.find({isListed:true});
       const brand = await Brand.find({isBlocked:false});
       res.render("product-add",{
          cat:category,
          brand:brand
       });

    } catch (error) {
        
        res.redirect("/pageerror");
    }
}





// const addProducts = async (req, res) => {
//     try {
//         const products = req.body;

//         // Check if product with the same name exists
//         const productExists = await Product.findOne({
//             productName: products.productName,
//         });

//         if (!productExists) {
//             const images = [];
//             if (req.files && req.files.length > 0) {
//                 for (let i = 0; i < req.files.length; i++) {
//                     const originalImagePath = req.files[i].path;

//                     // Crop image using sharp and save it in 'product-images'
//                     const resizedImagePath = path.join(
//                         'public',
//                         'upload',
//                         'product-images',
//                         req.files[i].filename
//                     );
//                     await sharp(originalImagePath)
//                         .resize({ width: 440, height: 440 })
//                         .toFile(resizedImagePath);
//                     images.push(req.files[i].filename);
//                 }
//             }

//             // Find the category by name and get its _id
//             const category = await Category.findOne({ name: products.category });

//             if (!category) {
//                 return res.status(400).json("Invalid category name");
//             }
//             console.log("product-size : ", products.sizeOptions);
//             // Create new product with schema-aligned properties
//             const newProduct = new Product({
//                 productName: products.productName,
//                 description: products.description,
//                 brand: products.brand,
//                 category: category._id,
//                 regularPrice: products.regularPrice,
//                 salePrice: products.salePrice,
//                 productOffer: products.productOffer || 0, // Default to 0 if not provided
//                 sizeOptions: products.sizeOptions, // Pass size option IDs
//                 color: products.color,
//                 productImage: images,
//                 isBlocked: false,
//                 status: products.status || "Available", // Default to "Available"
//             });

//             await newProduct.save();
//             return res.redirect("/admin/addProducts");
//         } else {
//             return res.status(400).json("Product already exists, please try with another name");
//         }
//     } catch (error) {
//         console.error("Error saving product", error);
//         return res.redirect("/admin/pageerror");
//     }
// };




const addProducts = async(req,res)=>{
    try {
        const products = req.body;

        //checks if product with same name exists
        const productExists = await Product.findOne({
            productName:products.productName,
        });

        //if same name dont exist
      if(!productExists){
        const images = [];
        if(req.files && req.files.length > 0){
            for(let i = 0; i < req.files.length; i++){
                const originalImagePath = req.files[i].path;

                //crop image using sharp and saves image in product-image 
                const resizedImagePath = path.join('public','upload','product-images',req.files[i].filename);
                await sharp(originalImagePath).resize({width:440,height:440}).toFile(resizedImagePath);
                images.push(req.files[i].filename);
            }
        }
        
        const categoryId = await Category.findOne({name:products.category});

        if(!categoryId){
            return res.status(400).json("Invalid category name");   //join
        }
        console.log("product-size : ",products.size);


        // Convert the size object into a Map of Numbers
        const sizeMap = new Map();
        for (let size in products.size) {
            sizeMap.set(size, Number(products.size[size])); // Ensure the size values are numbers
        }

        //  // Convert the size object to a plain JavaScript object
        //  const sizeObj = {};
        //  for (let size in products.size) {
        //      sizeObj[size] = Number(products.size[size]); // Ensure size values are numbers
        //  }
       


        const newProduct = new Product({
            productName : products.productName,
            description : products.description,
            brand : products.brand,
            category : categoryId._id,
            regularPrice : products.regularPrice,
            salePrice : products.salePrice,
            createdOn : new Date(),
            quantity : products.quantity,
            // size: sizeObj, // Pass the plain JavaScript object for sizes
            // size : products.size,
            size: sizeMap, // Pass the Map
            // size: product.size, // Pass the size object directly
            color : products.color,
            productImage : images,
            status : 'Available',
        })
        
        await newProduct.save();
        return res.redirect("/admin/addProducts");

      }else{
        return res.status(400).json("Product already exist, please try with another name");
      }

    } catch (error) {
        console.error("Error saving product",error);
        return res.redirect("/admin/pageerror");
        
    }
}


const getAllProducts = async(req,res)=>{
    try{
        const search = req.query.search||"";
        const page = req.query.page||1;
        const limit = 4;
   
        const productData = await Product.find({
            $or:[
              {productName:{$regex:new RegExp(".*"+search+".*","i")}},
              {brand:{$regex:new RegExp(".*"+search+".*","i")}},
            ], 
        })
        .limit(limit*1)
        .skip((page-1)*limit)
        .populate('category')
        .exec();

         const count = await Product.find({
            $or:[
                {productName:{$regex:new RegExp(".*"+search+".*","i")}},
                {brand:{$regex:new RegExp(".*"+search+".*","i")}},   
            ],
         }).countDocuments();

         const category = await Category.find({isListed:true});
         const brand = await Brand.find({isBlocked:false});


         
         if(category && brand){
            res.render("products",{
                data:productData,
                currentPage:page,
                totalPages:Math.ceil(count/limit),
                cat:category,
                brand:brand,
            })
         }else{
            res.render("page-404");
         }

    }catch(error){
       res.redirect("/pageerror");
    }
}


const addProductOffer = async(req,res)=>{
    try {
        
        const {productId,percentage} = req.body;


        // Find product and category
        const findProduct = await Product.findOne({_id:productId});
        if (!findProduct) {                                                                     //error handling
            return res.status(404).json({ status: false, message: "Product not found." });
        }
        const findCategory = await Category.findOne({_id:findProduct.category});
        if (!findCategory) {                                                                   //error handling
            return res.status(404).json({ status: false, message: "Category not found for the given product." });
        }
        
        
         // Check for category-level offer
        if(findCategory.categoryOffer>percentage){
            return res.json({status:false,message:"This product's category already has a higher or equal offer"});
        }



        // Calculate and update product price
        const discount = Math.floor(findProduct.regularPrice * (percentage / 100));
        findProduct.salePrice = findProduct.regularPrice - discount;
        findProduct.productOffer = parseInt(percentage, 10);
        await findProduct.save();

        // findProduct.salePrice = findProduct.salePrice-Math.floor(findProduct.regularPrice*(percentage/100));
        // findProduct.productOffer = parseInt(percentage);
        // await findProduct.save();
        findCategory.categoryOffer = 0;
        await findCategory.save();
        res.json({status:true,message:"Product offer successfully added"});


    } catch (error) {
        
         res.redirect("/pageerror");
         res.status(500).json({status: false, message: "Internal server Error"});

    }
} 

const removeProductOffer = async(req,res)=>{
    try {
        
        const {productId} = req.body
        const findProduct = await Product.findOne({_id:productId});
        const percentage = findProduct.productOffer;
        findProduct.salePrice = findProduct.salePrice+Math.floor(findProduct.regularPrice*(percentage/100));
        findProduct.productOffer = 0;
        await findProduct.save();
        res.json({status:true})

    } catch (error) {
        res.redirect("/pageerror");   
    }
}


const blockProduct = async(req,res)=>{
    try {
        
       let id = req.query.id;
       await Product.updateOne({_id:id},{$set:{isBlocked:true}});
       res.redirect("/admin/products");

    } catch (error) {
        res.redirect("/pageerror");
    }
}


const unblockProduct = async(req,res)=>{
    try {
        
       let id = req.query.id;
       await Product.updateOne({_id:id},{$set:{isBlocked:false}});
       res.redirect("/admin/products");

    } catch (error) {
        res.redirect("/pageerror");
    }
}


const getEditProduct = async(req,res)=>{
    try {
        
        const id = req.query.id;
        const product = await Product.findOne({_id:id});
        const category = await Category.find({});
        const brand = await Brand.find({});
        console.log("product : ",product);
        res.render("edit-product",{
            product:product,
            cat:category,
            brand:brand,
        })

    } catch (error) {
        res.redirect("/pageerror");
    }
}



const editProduct = async(req,res)=>{
    try {
        // console.log(req.files);   //debug point

        const id =req.params.id;
        const product = await Product.findOne({_id:id});
        const data = req.body;
        const existingProduct = await Product.findOne({
            productName:data.productName,
            _id:{$ne:id}
        })

        if(existingProduct){
            return res.status(400).json({error:"Product with this name already exists. please try with another name"});

        }

        const images = [];

        if(req.files && req.files.length>0){
            for(let i = 0; i < req.files.length; i++){
                images.push(req.files[i].filename);
            }
        }
        // console.log("category name new : ",data.category);    // debug point

        const category = await Category.findOne({name:data.category}); 
        const categoryId = category._id;
        // console.log("categoryId : ",categoryId);     //debug point

        const updateFields = {
            productName:data.productName,
            description:data.description,
            brand:data.brand,
            category:categoryId,
            regularPrice:data.regularPrice,
            salePrice:data.salePrice,
            quantity:data.quantity,
            size:data.size,
            color:data.color
        }
        if(req.files.length>0){
            updateFields.$push = {productImage:{$each:images}};
            // updateFields.productImage = images;
        }
        await Product.findByIdAndUpdate(id,updateFields,{new:true});
        res.redirect("/admin/products");


    } catch (error) {
        
        console.error(error);
        res.redirect("/pageerror");
    }
}


const deleteSingleImage = async(req,res)=>{
    try {
        
       const {imageNameToServer,productIdToServer} = req.body;
       const product = await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameToServer}});
       const imagePath = path.join("public","uploads","re-image",imageNameToServer);
       if(fs.existsSync(imagePath)){
        await fs.unlinkSync(imagePath);
        console.log(`Image ${imageNameToServer} deleted successfully`);

       }else{
          console.log(`Image ${imageNameToServer} not found`);
       }
       res.send({status:true});

    } catch (error) {
        res.redirect("/pageerror");
    }
}



module.exports = {
    getProductAddPage,
    addProducts,
    getAllProducts,
    addProductOffer,
    removeProductOffer,
    blockProduct,
    unblockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage
}