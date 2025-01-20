const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");


const categoryInfo = async(req,res)=>{
    try{
       const page = parseInt(req.query.page)||1;
       const limit = 4;
       const skip = (page-1)*limit;

       const categoryData = await Category.find({})
       .sort({createdAt:-1})
       .skip(skip)
       .limit(limit);

        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories/limit);
        res.render("category",{
            cat:categoryData,
            currentPage:page,
            totalPages:totalPages,
            totalCategories:totalCategories
        });

    }catch(error){
        console.error(error);
        res.redirect("/pageerror");
    }
}




const addCategory = async(req,res)=>{
   
    const {name,description} = req.body;
    try{  

        console.log(name);//debug
       const lowercaseCategoryName = name.trim().toLowerCase();
       const existingCategory = await Category.findOne({name:lowercaseCategoryName});
       console.log(existingCategory);
       if(existingCategory){
          return res.status(400).json({error:"Category already exists"});
       }
       const newCategory = new Category({
          name,
          description,
       })
       await newCategory.save();
       return res.json({message:"Category added successfully"})

    }catch(error){
       return res.status(500).json({error:"Internal Server Error"});
    }
}





const addCategoryOffer = async (req, res) => {
    try {
        const percentage = parseInt(req.body.percentage);
        const categoryId = req.body.categoryId;

        // Fetch the category by ID
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ status: false, message: "Category not found" });
        }

        // Fetch all products in the category
        const Products = await Product.find({ category: category._id });

        // Check if any product has a product offer lower than the new category offer
        const hasLowerProductOffer = Products.some((product) => product.productOffer < percentage);

        if (!hasLowerProductOffer) {
            // If no product has a lower offer, do not apply the category offer
            return res.json({ status: false, message: "None of the products have a lower offer than the category offer. Category offer will not be applied." });
        }

        // Update the category offer
        await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });

        // Adjust product offers based on the category offer
        for (const product of Products) {
            if (product.productOffer < percentage) {
                // Update product offer to match the category offer if it is lower
                product.productOffer = percentage;
                product.salePrice = product.regularPrice * (1 - (percentage / 100)); // Adjust salePrice
            }
            // Retain the existing product offer if it's greater than the category offer
            await product.save();
        }

        res.json({ status: true });

    } catch (error) {
        res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};






const removeCategoryOffer = async(req,res)=>{
    try{

        const categoryId = req.body.categoryId;
        const category = await Category.findById(categoryId);

        if(!category){
            return res.status(404).json({status:false, message:"Category not found"});
        }
        
        const percentage = category.categoryOffer;
        const products = await Product.find({category:category._id});

        if(products.length > 0){
            for(const product of products){
                product.salePrice += Math.floor(product.regularPrice * (percentage/100));
                product.productOffer = 0;
                await product.save();
            }
        }
        category.categoryOffer = 0;
        await category.save();
        res.json({status:true});

    }catch(error){
        res.status(500).json({status:false, message:"Internal Server Error"});
    }
}


const getListCategory = async(req,res)=>{
    try{
       let id = req.query.id;
       await Category.updateOne({_id:id},{$set:{isListed:false}});
       res.redirect("/admin/category");

    }catch(error){
       res.redirect("/pageerror");
    }
}

const getUnlistCategory = async(req,res)=>{
    try{
       let id = req.query.id;
       await Category.updateOne({_id:id},{$set:{isListed:true}});
       res.redirect("/admin/category");

    }catch(error){
       res.redirect("/pageerror");
    }
}


const getEditCategory = async(req,res) => {
    try{
      
       const id = req.query.id;
      
       const category = await Category.findOne({_id:id});
       if (!category) { //add
        return res.status(404).send("Category not found");
       }

       res.render("editCategory", { category });//add

    }catch(error){
        res.redirect("/pageerror");
    }
}



//accessing id recived
const editCategory = async(req,res)=>{
    try{
       const id = req.params.id;
       
       const {categoryName,description} = req.body;
       const existingCategory = await Category.findOne({name:categoryName});

       if(existingCategory){
         return res.status(400).json({error:"Category exists, please choose another name"});
       }

       const updateCategory = await Category.findByIdAndUpdate(id,{
          name:categoryName,
          description:description,
       },{new:true});//document immediatly returns
       
       if(updateCategory){
         res.redirect("/admin/category");
       }else{
         res.status(400).json({error:"Category not found"});
       }

    }catch(error){
      res.status(500).json({error:"Internal server error"});
    }
}





module.exports = {
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getUnlistCategory,
    getEditCategory,
    editCategory
}


























































































































//add category offer new 

// const addCategoryOffer = async(req,res)=>{
//     try{
     
//        const percentage = parseInt(req.body.percentage);
//        const categoryId = req.body.categoryId;
    
//        const category = await Category.findById(categoryId);
//        if(!category){
//          return res.status(404).json({status:false,message:"Category not found"});
//        }
//        const Products = await Product.find({category:category._id});
//        const hasProductOffer = Products.some((product)=>product.productOffer > percentage);
//        if(hasProductOffer){    //passing error to frontend
//          return res.json({status:false , message:"Products within this category already have product offers"});
//        }
//        await Category.updateOne({_id:categoryId},{$set:{categoryOffer:percentage}});
       
//        // product offer set to zero if category offer is their
//        for(const product of Products){ //add
//          product.productOffer = 0;
//          product.salePrice = product.regularPrice;
//          await product.save();
//        }
//        res.json({status:true});

        

//     }catch(error){
//        res.status(500).json({status:false, message:"Internal Server Error"});
//     }
// };









// const addCategoryOffer = async (req, res) => {
//     try {
//         const percentage = parseInt(req.body.percentage);
//         const categoryId = req.body.categoryId;

//         // Fetch the category by ID
//         const category = await Category.findById(categoryId);
//         if (!category) {
//             return res.status(404).json({ status: false, message: "Category not found" });
//         }

//         // Fetch all products in the category
//         const Products = await Product.find({ category: category._id });

//         // Check if any product has a product offer greater than the new category offer
//         const hasProductOffer = Products.some((product) => product.productOffer > percentage);
//         if (hasProductOffer) {
//             return res.json({ status: false, message: "Products within this category already have product offers greater than the category offer" });
//         }

//         // Update the category offer
//         await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });

//         // Adjust product offers based on the category offer
//         for (const product of Products) {
//             if (product.productOffer < percentage) {
//                 product.productOffer = percentage;
//                 product.salePrice = product.regularPrice * (1 - (percentage / 100)); // Adjust salePrice based on category offer
//             }
//             await product.save();
//         }

//         res.json({ status: true });

//     } catch (error) {
//         res.status(500).json({ status: false, message: "Internal Server Error" });
//     }
// };

