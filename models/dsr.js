
var Sequelize = require('sequelize');
var User = require('./user');


// create a sequelize instance with our local postgres database information.
var sequelize = new Sequelize('postgres://admin:aish@localhost:5432/login');

// setup User model and its fields.
var DSR = sequelize.define('dsr', {
  id:{
    type: Sequelize.INTEGER,
    autoIncrement: true
  },
	submission_date: {
		type: Sequelize.DATEONLY,
		allowNull: false,
		primaryKey: true
	},
	dsr_note: {
		type: Sequelize.TEXT,
    notEmpty: true,
		allowNull: false
	},
   // Set FK relationship (hasMany) with `Trainer`
  user_id: {
    type: Sequelize.STRING,
    onDelete: 'NO ACTION',
    allowNull:false,
    primaryKey: true,
    references: {
      model: "users",
      key: "username"
    }
  }
    });
//  User.hasMany(DSR,{foreignKey: 'username', sourcekey: 'username'});
//  DSR.belongsTo(User,{foreignKey: 'username', sourcekey: 'username'});//ll the defined tables in the specified database.


sequelize.sync()
    .then(() => console.log('dsr table has been successfully created, if one doesn\'t exist'))
    .catch(error => console.log('This error occured', error));

// export User model for use in other files.
module.exports = DSR;