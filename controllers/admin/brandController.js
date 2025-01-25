const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");





//add brand modified

const addBrand = async (req, res) => {
    try {
        const { name: brandName } = req.body;

        // Validate brand name
        if (!brandName || !brandName.trim()) {
            return res.status(400).json({ success: false, message: "Brand name is required." });
        }


        // Check if brand name contains only alphabets
        if (!/^[a-zA-Z]+$/.test(brandName.trim())) {
            return res.status(400).json({ success: false, message: "Brand name must contain only alphabets." });
        }

        // Check if brand already exists (case-insensitive)
        const existingBrand = await Brand.findOne({
            brandName: { $regex: new RegExp(`^${brandName.trim()}$`, 'i') }
        });

        if (existingBrand) {
            return res.status(400).json({ success: false, message: "Brand already exists." });
        }

        // Validate and add brand image
        if (req.file && req.file.filename) {
            const newBrand = new Brand({
                brandName: brandName.trim(),
                brandImage: req.file.filename
            });

            await newBrand.save();
            return res.status(200).json({ success: true, message: "Brand added successfully." });
        } else {
            return res.status(400).json({ success: false, message: "Brand image is required." });
        }
    } catch (error) {
        console.error("Error adding brand:", error);
        return res.status(500).json({ success: false, message: "An error occurred while adding the brand." });
    }
};





// const addBrand = async (req, res) => {
//     try {
//         const brand = req.body.name;

//         // Regex for case-insensitive comparison
//         const findBrand = await Brand.findOne({
//             brandName: { $regex: new RegExp(`^${brand}$`, 'i') }
//         });

//         if (!findBrand) {
//             if (req.file && req.file.filename) {
//                 const image = req.file.filename;
//                 const newBrand = new Brand({
//                     brandName: brand,
//                     brandImage: image
//                 });
//                 await newBrand.save();
//                 res.redirect("/admin/brands");
//             } else {
//                 // Handle case where the image file is not provided
//                 // res.status(400).send("Brand image is required.");
//                 res.status(400).json({ success: false, message: "Brand image is required." });
//             }
//         } else {
//             // Handle case where the brand already exists
//             // res.status(400).send("Brand already exists.");
//             res.status(400).json({success: false, message: "Brand already exists."});
//         }
//     } catch (error) {
//         console.error(error);
//         res.redirect("/pageerror");
//     }
// };








const getBrandPage = async(req,res)=>{
    try{
       const page = parseInt(req.query.page)||1;
       const limit = 4;
       const skip = (page-1)*limit;
       const brandData = await Brand.find({}).sort({createdAt:-1}).skip(skip).limit(limit);
       const totalBrands = await Brand.countDocuments();
       const totalPages = Math.ceil(totalBrands/limit);
       const reverseBrand = brandData.reverse();
       res.render("brands",{
         data: reverseBrand,
         currentPage:page,
         totalPages:totalPages,
         totalBrands:totalBrands
       })

    }catch(error){
        res.redirect("/pageerror");
    }
};




const blockBrand = async(req,res)=>{
    try{

      const id = req.query.id;
      await Brand.updateOne({_id:id},{$set:{isBlocked:true}});
      res.redirect("/admin/brands");

    }catch(error){
       res.redirect("/pageerror");
    }
}

const unBlockBrand = async(req,res)=>{
    try {
        
       const id = req.query.id;
       await Brand.updateOne({_id:id},{$set:{isBlocked:false}});
       res.redirect("/admin/brands");

    } catch (error) {
        res.redirect("/pageerror");
    }
}




const deleteBrand = async (req, res) => {
    try {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ success: false, message: "Brand ID is required." });
        }

        const result = await Brand.deleteOne({ _id: id });

        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: "Brand not found." });
        }

        return res.json({ success: true, message: "Brand deleted successfully." });
    } catch (error) {
        console.error("Error deleting brand:", error);
        return res.status(500).json({ success: false, message: "An error occurred while deleting the brand." });
    }
};






//delete brand latest
// const deleteBrand = async(req,res)=>{
//     try {
       
//         const {id} = req.query;
//         if(!id){
//             return res.status(400).redirect("/pageerror")
//         }
//         await Brand.deleteOne({_id:id});
//         res.redirect("/admin/brands");

//     } catch (error) {
//         console.error("Error deleting brand:",error);
//         res.status(500).redirect("/pageerror");
//     }
// }


module.exports = {
    getBrandPage,
    addBrand,
    blockBrand,
    unBlockBrand,
    deleteBrand,
    
}