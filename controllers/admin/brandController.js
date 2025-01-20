const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");


// const multer = require("multer");
// const path = require("path");

// // Multer storage configuration
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, path.join(__dirname, "../public/uploads/re-image"));
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + "-" + file.originalname); // Set a unique filename for each uploaded image
//   }
// });

// const upload = multer({ storage: storage });



// const addBrand = async (req, res) => {
//     try {
//       console.log('Request body:', req.body); // Should now show the brand name
//       console.log('Uploaded file:', req.file); // Should show the file information
  
//       const brand = req.body.name;
  
//       if (!req.file) {
//         return res.status(400).send({ message: "No image uploaded." });
//       }
  
//       const findBrand = await Brand.findOne({
//         brandName: { $regex: new RegExp(`^${brand}$`, 'i') }
//       });
  
//       if (!findBrand) {
//         const image = req.file.filename;
//         const newBrand = new Brand({
//           brandName: brand,
//           brandImage: image
//         });
  
//         await newBrand.save();
//         res.redirect("/admin/brands");
//       } else {
//         res.status(400).send({ message: "Brand already exists" });
//       }
//     } catch (error) {
//       console.log(error);
//       res.redirect("/pageerror");
//     }
//   };
  




// const addBrand = async (req, res) => {
//     try {
//       // Log the incoming request
//       console.log('Request body:', req.body);
//       console.log('Uploaded file:', req.file);
  
//       const brand = req.body.name;
  
//       // If the file is not being uploaded
//       if (!req.file) {
//         return res.status(400).send({ message: "No image uploaded." });
//       }
  
//       const findBrand = await Brand.findOne({
//         brandName: { $regex: new RegExp(`^${brand}$`, 'i') }
//       });
  
//       if (!findBrand) {
//         const image = req.file.filename; // Get the uploaded image filename from multer
//         const newBrand = new Brand({
//           brandName: brand,
//           brandImage: image // Save the image filename
//         });
  
//         await newBrand.save();
//         res.redirect("/admin/brands");
//       } else {
//         res.status(400).send({ message: "Brand already exists" });
//       }
//     } catch (error) {
//       console.log(error);
//       res.redirect("/pageerror");
//     }
//   };
  





// Backend route to handle image upload
// const addBrand = async (req, res) => {
//   try {
//     const brand = req.body.name;

//     const findBrand = await Brand.findOne({
//       brandName: { $regex: new RegExp(`^${brand}$`, 'i') }
//     });

//     if (!findBrand) {
//       const image = req.file.filename; // Get the uploaded image filename from multer
//       const newBrand = new Brand({
//         brandName: brand,
//         brandImage: image // Store the filename in the database
//       });

//       await newBrand.save();
//       res.redirect("/admin/brands");
//     } else {
//       res.status(400).send({ message: "Brand already exists" });
//     }

//   } catch (error) {
//     console.log(error);
//     res.redirect("/pageerror");
//   }
// }

// // Ensure to use multer middleware for the file upload route
// app.post("/admin/addBrand", upload.single('image'), addBrand);








// const multer = require("multer");
// const path = require("path");

// const storage = multer.diskStorage({
//     destination:(req,file,cb)=>{
//         cb(null,path.join(__dirname,"../public/uploads/re-image"));
//     },
//     filename:(req,file,cb)=>{
//         cb(null,Date.now()+"-"+file.originalname);
//     }
// })






// const upload = multer({ storage: storage });

// const addBrand = async (req, res) => {
//   try {
//     const brand = req.body.name;
    
//     const findBrand = await Brand.findOne({
//       brandName: { $regex: new RegExp(`^${brand}$`, 'i') }
//     });

//     if (!findBrand) {
//       const image = req.file.filename;
//       const newBrand = new Brand({
//         brandName: brand,
//         brandImage: image
//       });

//       await newBrand.save();
//       res.redirect("/admin/brands");
//     }

//   } catch (error) {
//     console.log(error);
//     res.redirect("/pageerror");
//   }
// }



const addBrand = async (req, res) => {
    try {
        const brand = req.body.name;

        // Regex for case-insensitive comparison
        const findBrand = await Brand.findOne({
            brandName: { $regex: new RegExp(`^${brand}$`, 'i') }
        });

        if (!findBrand) {
            if (req.file && req.file.filename) {
                const image = req.file.filename;
                const newBrand = new Brand({
                    brandName: brand,
                    brandImage: image
                });
                await newBrand.save();
                res.redirect("/admin/brands");
            } else {
                // Handle case where the image file is not provided
                res.status(400).send("Brand image is required.");
            }
        } else {
            // Handle case where the brand already exists
            res.status(400).send("Brand already exists.");
        }
    } catch (error) {
        console.error(error);
        res.redirect("/pageerror");
    }
};








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


// const addBrand = async(req,res)=>{
//     try{
       
//        const brand = req.body.name;
       
//         //  regex for case-insensitive comparison
//        const findBrand = await Brand.findOne({
//            brandName: { $regex: new RegExp(`^${brand}$`, 'i') }
//         });
       
//        if(!findBrand){
//          const image = req.file.filename;
//          const newBrand = new Brand({
//             brandName:brand,
//             brandImage:image
//          })
//          await newBrand.save();
//          res.redirect("/admin/brands");
//        }

//     }catch(error){
//         res.redirect("/pageerror");
//     }
// }

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

const deleteBrand = async(req,res)=>{
    try {
       
        const {id} = req.query;
        if(!id){
            return res.status(400).redirect("/pageerror")
        }
        await Brand.deleteOne({_id:id});
        res.redirect("/admin/brands");

    } catch (error) {
        console.error("Error deleting brand:",error);
        res.status(500).redirect("/pageerror");
    }
}


module.exports = {
    getBrandPage,
    addBrand,
    blockBrand,
    unBlockBrand,
    deleteBrand,
    
}