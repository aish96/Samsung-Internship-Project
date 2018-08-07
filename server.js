var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var morgan = require('morgan');
var User = require('./models/user');
var DSR = require('./models/dsr');
// var models= require('./models/index');
var flash = require('connect-flash');
var path = require('path');
var bcrypt = require('bcrypt-nodejs');
var fs = require('fs');
var Json2csvParser = require('json2csv').Parser;

// invoke an instance of express application.
var app = express();

// set our application port
app.set('port', 9000);

// set morgan to log info about our requests for development use.
app.use(morgan('dev'));

// initialize body-parser to parse incoming parameters requests to req.body
app.use(bodyParser.urlencoded({ extended: true }));

// initialize cookie-parser to allow us access the cookies stored in the browser. 
app.use(cookieParser());
app.use(express.static('public'));
// initialize express-session to allow us track the logged-in user across sessions.
app.use(session({
    key: 'user_sid',
    secret: 'somerandonstuffs',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 600000
    }
}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(flash());



// This middleware will check if user's cookie is still saved in browser and user is not set, then automatically log the user out.
// This usually happens when you stop your express server after login, your cookie still remains saved in the browser.
app.use((req, res, next) => {
    if (req.cookies.user_sid && !req.session.user) {
        res.clearCookie('user_sid');        
    }
    next();
});


// middleware function to check for logged-in users
var sessionChecker = (req, res, next) => {
    if (req.session.user && req.cookies.user_sid) {
        res.redirect('/dashboard');
    } else {
        next();
    }    
};


// route for Home-Page
app.get('/', sessionChecker, (req, res) => {
    res.redirect('/login');
});


// route for user signup
app.route('/signup')
    .get(sessionChecker, (req, res) => {
        // res.sendFile(__dirname + '/public/signup.html');
        res.render('signup')

    })
    .post((req, res) => {
        User.findOne({
            where : { username: req.body.username}
        })
        .then(user =>{
            if(user && user.dataValues.deleted){
                user.updateAttributes({
                    password : req.body.password,
                    email : req.body.email,
                    access_type : req.body.access_type,
                    deleted : false
                })
                .then(function () {
                    req.session.user = user.dataValues;
                    req.flash('welcome_msg','Welcome '+req.body.username);
                    res.redirect('/dashboard');
                });
                
            }else
            {
                    User.create({
                    username: req.body.username,
                    email: req.body.email,
                    password: req.body.password,
                    access_type:req.body.access_type
                })
                .then(user => {
                    req.session.user = user.dataValues;
                    req.flash('welcome_msg','Welcome '+req.body.username);
                    res.redirect('/dashboard');
                })
                .catch(error => {
                    console.log("erooor==>"+error);
                    res.redirect('/signup');
                });
            }
        })
        
    });


// route for user Login
app.route('/login')
    .get(sessionChecker, (req, res) => {
        // res.sendFile(__dirname + '/public/login.html');
    res.render('login',{error_msg:req.flash('error_msg')});
    })
    .post((req, res) => {
        var username = req.body.username,
            password = req.body.password;

        User.findOne({ where: { username: username } })
        .then(function (user) {
            if (!user || user.dataValues.deleted || !user.validPassword(password) ) {
                req.flash("error_msg","Invalid Login! Try again ...");
                res.redirect('/login');
            
            } else{
                req.session.user = user.dataValues;
                req.flash('welcome_msg','Welcome back '+username +" !");
                res.redirect('/dashboard');
            }
        });
    });


// route for user's dashboard

app.get('/dashboard', (req, res) => {
    if (req.session.user && req.cookies.user_sid) {
       res.render('dashboard',{welcome_msg: req.flash('welcome_msg'),error_msg: req.flash('error_msg')});
    } else {
          req.flash("error_msg","Invalid Login! Try again ...");
        res.redirect('/login');
    }
});
// app.get('/dashboard_admin', (req, res) => {
//     if (req.session.user && req.cookies.user_sid) {
//        res.render('dashboard_admin',{welcome_msg:req.flash('welcome_msg')});
//     } else {
//           req.flash("error_msg","Invalid Login! Try again ...");
//         res.redirect('/login');
//     }
// });


// route for user logout
app.get('/logout', (req, res) => {
    if (req.session.user && req.cookies.user_sid) {
        res.clearCookie('user_sid');
        res.redirect('/');
    } else {
        res.redirect('/login');
    }
});

app.route('/reset_password')
   .get(sessionChecker, (req, res) => {
       res.render('reset_password');
   })
   .post((req,res) => {
         var email = req.body.email;

   });

app.route('/dashboard/enter_dsr')
    .get(function(req,res) {
     if (req.session.user && req.cookies.user_sid) {
        res.render('./partials/enter_dsr',{welcome_msg:req.flash('welcome_msg'),error_msg:req.flash('error_msg')});
        } else {
            res.redirect('/login');
        }    
     })
    .post((req,res)=>{
        DSR.create({
            submission_date: req.body.date,
            dsr_note: req.body.dsr,
            user_id: req.session.user.username
        })
        .then(function(dsr){
            req.flash('welcome_msg','DSR created successfully !'); 
            res.redirect('/dashboard');
             })
        .catch(error => {
            console.log(error);
            req.flash('error_msg','Oops! Unable to create dsr ');
            res.redirect('/dashboard')
      
        });
    });


app.route('/dashboard/view_dsr')
    .get(function(req,res) {
     if (req.session.user && req.cookies.user_sid) {
        res.render('./partials/view_dsr',{welcome_msg:req.flash('welcome_msg')});
        } else {
            res.redirect('/login');
        }    
     })
    .post((req,res)=>{
    var user_id = req.session.user.username,
        submission_date =req.body.date ;
    DSR.findOne({where: 
        {user_id : user_id,
        submission_date: submission_date }})
       .then(function(dsr){
        if(dsr){
            res.send({dsr_note:dsr.dataValues.dsr_note , date:dsr.dataValues.submission_date});
        }else{
            res.send({dsr_note: 'No DSR for this date !'})
        }
       });
    })
    .delete((req,res)=>{
        var user_id = req.session.user.username,
        submission_date =req.query.date ;
        DSR.destroy({
        where:{
            submission_date:submission_date,
            user_id:user_id
        }
    })
    .then(function(dsr) {
        res.send({msg:"DSR deleted successfully!"});   
    });
    

    });


app.route('/dashboard/edit_dsr')
    .get(function(req,res) {
     if (req.session.user && req.cookies.user_sid) {
        if(req.session.user.access_type == 'G'){
        res.render('./partials/edit_dsr',{welcome_msg:req.flash('welcome_msg'),error_msg:req.flash('error_msg')});
            }else{
                res.redirect('/dashboard/edit_dsr_admin');
            }
        } else {
            res.redirect('/login');
        }    
     })
     .post((req,res)=>{
    var user_id = req.session.user.username,
        submission_date =req.body.date ,
        date = new Date();

    var today = date.toISOString().slice(0,10);

        if(submission_date == today){
            if( req.body.dsr.trim()!="" ){
                    DSR.findOne({where: 
                        {user_id : user_id,
                        submission_date: submission_date }
                    })
                    .then(function(dsr){
                        if(dsr){
                            dsr.updateAttributes({
                                submission_date: submission_date ,
                                    dsr_note: req.body.dsr
                                 });
                            req.flash('welcome_msg','DSR updated successfully !'); 
                            res.redirect('/dashboard');
                        }else{
                            req.flash('error_msg','No DSR for this date !'); 
                                res.redirect('/dashboard');
                        }
                    });
            }else{
                req.flash('error_msg',"DSR cannot be blank !");
         res.redirect('/dashboard');
            }
     }else{
        req.flash('error_msg',"You are allowed to edit only today's DSR");
         res.redirect('/dashboard');
     }

});

app.route('/dashboard/edit_dsr_admin')
    .get(function(req,res) {
        User.findAll({where:{
            deleted:false
        }})
            .then(function(users) {
                data=[];
                users.forEach(function(user) {
                    data.push(user.dataValues.username) ;
                });
                res.render('./partials/edit_dsr_admin',{welcome_msg:req.flash('welcome_msg'),error_msg:req.flash('error_msg'),data:data});
            });
        
    })
    .post(function(req,res) {
         var submission_date = req.body.date,
            user = req.body.user,
            dsr_note = req.body.dsr;
            DSR.update({
                dsr_note:dsr_note
            },{
                where:{
                    user_id:user,
                    submission_date:submission_date
                }
            })
            .then(function(dsr) {
                if(dsr.length>0){
                console.log(dsr);
                req.flash("welcome_msg","DSR updated successfully");
                res.redirect('/dashboard');
            }else{
                req.flash("error_msg","DSR coudnt be edited !");
                res.redirect('/dashboard');
            }
            });
    })
     .delete((req,res)=>{
        var user_id = req.query.user,
        submission_date =req.query.date ;
        DSR.destroy({
        where:{
            submission_date:submission_date,
            user_id:user_id
        }
    })
    .then(function(dsr) {
        res.send({msg:"DSR deleted successfully!"});   
    });
    

    });

app.post('/get_data',function(req,res) {
    var submission_date = req.body.date;
        if(req.body.user){
            user = req.body.user;
        }else{
            user = req.session.user.username;
        }
        DSR.findOne({where:{
            submission_date:submission_date,
            user_id: user
        }})
        .then(function(dsr) {
            if(dsr){console.log(dsr);
                res.send({data:dsr.dataValues.dsr_note});
            }else{
                res.send({msg:"No DSR entered by "+user +" on " +submission_date});
            }
        });
    });
app.route('/dashboard/generate_report')
    .get(function(req,res){
       if (req.session.user && req.cookies.user_sid) {  
        if(req.session.user.access_type == 'A'){
            res.render('./partials/generate_report');
                }else{
                    req.flash("error_msg","You are not allowed to generate report !");
                    res.redirect('/index');
                }
        }else{
            res.redirect('/login');
        }
            
    })
    .post((req,res)=>{
        var from = req.body.from,
            to = req.body.to;
        DSR.findAll({where:{
                        submission_date:{
                            [Op.between]:[from,to]
                        }
        }})
        .then(function(dsrs){
            console.log(dsrs,dsrs.length);
            if(dsrs.length > 0)
            {   
                var data ={};
                data.dsr = [];
                // console.log(dsrs.length,dsrs[0]);
                dsrs.forEach(function (dsr) {
                    var note={};
                    note.id = dsr.dataValues.id;
                    note.submission_date = dsr.dataValues.submission_date;
                    note.user_id = dsr.dataValues.user_id;
                    note.dsr_note = dsr.dataValues.dsr_note;
                    
                    data.dsr.push(note);
                });

                var date = new Date(),
                    name =  req.session.user.username+'_' + date.toLocaleString().replace(':','-').replace(' ','_').replace(':','-') +".csv" ,
                    filename = __dirname+'/results/' + name;


                var fields = ['id','submission_date','user_id','dsr_note'];
                var json2csvParser = new Json2csvParser({ fields });

                var csv = json2csvParser.parse(data.dsr);
 
                console.log(csv);

                fs.writeFile(filename, csv , function (err) {
                  if (err) throw err;
                  console.log('Saved!');  
                });

                data.file = name;
              
                res.send(data);
            }else{
                req.flash("error_msg","No DSRs entered between the selected dates");
                res.redirect('/dashboard');
            }
        });
    });
    
app.route('/dashboard/modify_users')
    .get(function (req,res) {
    if (req.session.user && req.cookies.user_sid) {  
        if(req.session.user.access_type == 'A'){
            User.findAll()
                .then(function(users) {
                    if(users){
                        var data=[];
                        users.forEach(function(user) {
                            var info={};
                            if(!user.dataValues.deleted ){
                            info.username = user.dataValues.username;
                            info.password = user.dataValues.password;
                            info.email = user.dataValues.email;
                            info.access_type = user.dataValues.access_type;
                            if(user.dataValues.username== req.session.user.username)
                        {
                            info.this_user = true;
                        }else
                        {info.this_user =false;}

                            data.push(info);
                        }
                        });
                        res.render('./partials/modify_users' , {data:data});
                        }else{
                            req.flash("error_msg","No users yet");
                            res.redirect('/dashboard');
                        }
                });

                }else{
                    req.flash("error_msg","You are not allowed to view this !");
                    res.redirect('/index');
                }
        }else{
            res.redirect('/login');
        }  

      })
    .post(function(req,res) {
        var username = req.body.username,
            password = req.body.password;
            if(password.trim()==''){
             User.update(
            {email : req.body.email ,
            access_type: req.body.access_type},
            {where:{ username: username }
        })
        .then(function(user) {
            req.flash('welcome_msg','User updated successfully');
            res.redirect('/dashboard');
        });
    }else{
         salt = bcrypt.genSaltSync(),
            hashpwd =  bcrypt.hashSync(password.trim(),salt);
            console.log(hashpwd);
        User.update(
            {email : req.body.email ,
            password: hashpwd ,
            access_type: req.body.access_type},
            {where:{ username: username }
        })
        .then(function(user) {
            req.flash('welcome_msg','User updated successfully');
            res.redirect('/dashboard');
        });
    }

    });
app.get('/index',function (req,res) {
    res.render(__dirname+"/views/partials/index.ejs",{welcome_msg:req.flash('welcome_msg'),error_msg:req.flash('error_msg')});
});

app.post('/delete_user',function(req,res) {
    var username = req.body.username;

    User.update({
        deleted:true
    },{
        where:{
            username:username
        }
    })
    .then(function(user){
        res.send({msg:"User deleted successfully"});
    });
   
});



app.get('/download/:id',function(req,res) {
    var filename = req.params.id;
    var filepath = __dirname + '/results/'+filename;
    res.download(filepath,filename);
});
// route for handling 404 requests(unavailable routes)
app.use(function (req, res, next) {
  res.status(404).send("Sorry can't find that!")
});


// start the express server
app.listen(app.get('port'), () => console.log(`App started on port ${app.get('port')}`));