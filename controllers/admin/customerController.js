const User = require("../../models/userSchema");


const customerInfo = async(req,res)=>{
    try{
        let search = "";

         // If there is a `search` query parameter, trim its value and assign it to `search`
        if(req.query.search){
            search = req.query.search.trim(); //add
        }

        //pagination logic
        let page = 1;
        if(req.query.page){
            page = parseInt(req.query.page); //add
        }
        const limit = 3;
        const skip = (page-1)*limit; //add

        // Query the database for customers (non-admin users) matching the search criteria
        const data = await User.find({
            isAdmin:false,
            $or:[
                {name:{$regex:".*"+search+".*"}},   // Case-insensitive search for name
                {email:{$regex:".*"+search+".*"}},  // Case-insensitive search for email
            ],
        })
         .limit(limit)
         .skip(skip)
         .exec();

 
  // counting total matching customer for pagination       
         const count = await User.find({
            isAdmin:false,
            $or:[
                {name:{$regex:".*"+search+".*"}},
                {email:{$regex:".*"+search+".*"}},
            ],
         }).countDocuments();
          

         const totalPages = Math.ceil(count / limit); //add
        //  const currentPage = req.query.page || 1;
         res.render("customers",{data,totalPages,currentPage:page});

    }catch(error){
        console.error("Error fetching customer info:", error);
        res.status(500).send("Internal Server Error");
    }
}


const customerBlocked = async(req,res)=>{
    try{
       let id = req.query.id;
       await User.updateOne({_id:id},{$set:{isBlocked:true}});
       res.redirect("/admin/users");
    }catch(error){
        res.redirect("/pageerror");
    }
}

const customerunBlocked = async(req,res)=>{

     try{
         let id = req.query.id;
         await User.updateOne({_id:id},{$set:{isBlocked: false}});
         res.redirect("/admin/users");
     }catch(error){
        res.redirect("/pageerror");
     }

}



module.exports = {
    customerInfo,
    customerBlocked,
    customerunBlocked,
}