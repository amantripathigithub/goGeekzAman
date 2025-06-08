const mongoose = require('mongoose');
const DB = process.env.DB
mongoose.connect(DB).then(()=>{
    console.log("connected to database");
}).catch((err)=>{
    console.log("not connected to database");
});