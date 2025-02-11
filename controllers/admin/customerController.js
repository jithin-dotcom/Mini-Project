const User = require("../../models/userSchema");


const customerInfo = async(req,res)=>{
    try{
        let search = ""; 
        if(req.query.search){
            search = req.query.search.trim(); 
        } 
        let page = 1;
        if(req.query.page){
            page = parseInt(req.query.page);
        }
        const limit = 3;
        const skip = (page-1)*limit; 
        const [data, count] = await Promise.all([
            User.find({
                isAdmin: false,
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }, 
                ],
            })
            .limit(limit)
            .skip(skip)
            .exec(),
        
            User.countDocuments({
                isAdmin: false,
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                ],
            })
        ]);
        
                 
         const totalPages = Math.ceil(count / limit); 
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




































































































































































 
        // const data = await User.find({
        //     isAdmin:false,
        //     $or:[
        //         { name: { $regex: search, $options: 'i' } }, 
        //         { email: { $regex: search, $options: 'i' } },
                  
        //     ],
        // })
        //  .limit(limit)
        //  .skip(skip)
        //  .exec();

        //  const count = await User.find({
        //     isAdmin:false,
        //     $or:[
        //         { name: { $regex: search, $options: 'i' } },
        //         { email: { $regex: search, $options: 'i' } },
                
        //     ],
        //  }).countDocuments();