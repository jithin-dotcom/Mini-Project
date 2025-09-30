import User from "../../models/userSchema.js";


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




const customerInfoAjax = async (req, res) => {
    try {
        let search = "";
        if (req.query.search) {
            search = req.query.search.trim();
        }
        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page);
        }
        const limit = 3;
        const skip = (page - 1) * limit;
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
        res.json({
            success: true,
            customers: data, 
            totalPages,
            currentPage: page
        });
    } catch (error) {
        console.error("Error fetching customer info for AJAX:", error);
        res.status(500).json({ success: false, message: "Error fetching customers" });
    }
};



const customerBlocked = async (req, res) => {
    try {
        const { id } = req.body;  
        await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error blocking customer:", error);
        res.status(500).json({ success: false, message: "Error blocking customer" });
    }
}

const customerunBlocked = async (req, res) => {
    try {
        const { id } = req.body;  
        await User.updateOne({ _id: id }, { $set: { isBlocked: false } });
        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error unblocking customer:", error);
        res.status(500).json({ success: false, message: "Error unblocking customer" });
    }
}




const customerController ={
    customerInfo,
    customerBlocked,
    customerunBlocked,
    customerInfoAjax,
};
export default customerController;