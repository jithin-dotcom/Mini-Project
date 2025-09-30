
import Brand from "../../models/brandSchema.js";
import Product from "../../models/productSchema.js";




const addBrand = async (req, res) => {
    try {
        const { name: brandName } = req.body;
        if (!brandName || !brandName.trim()) {
            return res.status(400).json({ success: false, message: "Brand name is required." });
        }
        if (!/^[a-zA-Z\s]+$/.test(brandName.trim())) {
            return res.status(400).json({ success: false, message: "Brand name must contain only alphabets and spaces." });
        }
        if (brandName.trim().length < 3 || brandName.trim().length > 20) {
            return res.status(400).json({ success: false, message: "Brand name must be between 3 and 20 characters." });
        }
        const existingBrand = await Brand.findOne({
            brandName: { $regex: new RegExp(`^${brandName.trim()}$`, 'i') }
        });

        if (existingBrand) {
            return res.status(400).json({ success: false, message: "Brand already exists." });
        }
        if (req.file && req.file.filename) {
            const newBrand = new Brand({
                brandName: brandName.trim(),
                brandImage: [req.file.filename]
            });

            await newBrand.save();
            return res.status(200).json({ 
                status: true, 
                message: "Brand added successfully.",
                brand: newBrand
            });
        } else {
            return res.status(400).json({ status: false, message: "Brand image is required." });
        }
    } catch (error) {
        console.error("Error adding brand:", error);
        return res.status(500).json({ status: false, message: "An error occurred while adding the brand." });
    }
};





const getBrandPage = async(req,res)=>{
    try{
       const page = parseInt(req.query.page)||1;
       const limit = 4;
       const skip = (page-1)*limit;
       const [brandData, totalBrands] = await Promise.all([
        Brand.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Brand.countDocuments()
      ]);
    
   
       const totalPages = Math.ceil(totalBrands/limit);
       const reverseBrand = brandData;
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





const getBrandPageAjax = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;
        const [brandData, totalBrands] = await Promise.all([
            Brand.find({})
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Brand.countDocuments()
        ]);

        const totalPages = Math.ceil(totalBrands / limit);
        res.json({
            status: true,
            brands: brandData,
            currentPage: page,
            totalPages: totalPages
        });
    } catch (error) {
        console.error("Error fetching brand info for AJAX:", error);
        res.status(500).json({ status: false, message: "Error fetching brands" });
    }
};





const blockBrand = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ success: false, message: "Brand ID is required" });
        }
        const brand = await Brand.findByIdAndUpdate(
            id,
            { $set: { isBlocked: true } },
            { new: true }
        );
        if (!brand) {
            return res.status(404).json({ success: false, message: "Brand not found" });
        }
        res.json({ status: true });
    } catch (error) {
        console.error("Error blocking brand:", error);
        res.status(500).json({ status: false, message: "Error blocking brand" });
    }
};

const unBlockBrand = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ success: false, message: "Brand ID is required" });
        }
        const brand = await Brand.findByIdAndUpdate(
            id,
            { $set: { isBlocked: false } },
            { new: true }
        );
        if (!brand) {
            return res.status(404).json({ success: false, message: "Brand not found" });
        }
        res.json({ status: true });
    } catch (error) {
        console.error("Error unblocking brand:", error);
        res.status(500).json({ status: false, message: "Error unblocking brand" });
    }
};




const deleteBrand = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ success: false, message: "Brand ID is required." });
        }

        const result = await Brand.deleteOne({ _id: id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: "Brand not found." });
        }

        return res.json({ status: true, message: "Brand deleted successfully." });
    } catch (error) {
        console.error("Error deleting brand:", error);
        return res.status(500).json({ status: false, message: "An error occurred while deleting the brand." });
    }
};





const brandController ={
  getBrandPage,
  addBrand,
  blockBrand,
  unBlockBrand,
  deleteBrand,
  getBrandPageAjax,
};

export default brandController;
