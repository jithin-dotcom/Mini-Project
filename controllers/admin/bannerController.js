const Banner = require("../../models/bannerSchema");
const path = require("path");
const fs = require("fs");

const getBannerPage = async(req,res)=>{
    try {
       
        const findBanner = await Banner.find({});
        res.render("banner",{data:findBanner});

    } catch (error) {
        
        res.render("/pageerror");
    }
}


const getAddBannerPage = async(req,res)=>{
    try {
        
       res.render("addBanner");

    } catch (error) {
        res.redirect("/pageerror");
        
    }
}


const addBanner = async(req,res)=>{
    try{
         
    const data = req.body;
    const image = req.file;

      // Log the req.body to check if title and description are coming through
    //   console.log(data);  // Log to see if title and description are present
    //   console.log(image); // Log the image object

    // Ensure that the image is uploaded
    if (!image) {
        return res.status(400).send("No image file uploaded.");
    }

    const newBanner = new Banner({
        image:image.filename,
        title:data.title,
        description:data.description,
        startDate: new Date(data.startDate+"T00:00:00"),
        endDate: new Date(data.endDate+"T00:00:00"),
        link:data.link,
    })

    await newBanner.save().then((data)=>console.log(data));
    res.redirect("/admin/banner");

    }catch(error){
      res.redirect("/admin/pageerror")
    }
}




module.exports = {
    getBannerPage,
    getAddBannerPage,
    addBanner,
}