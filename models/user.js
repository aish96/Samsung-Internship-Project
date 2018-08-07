var Sequelize = require('sequelize');
var bcrypt = require('bcrypt-nodejs');
module.exports=  Op = Sequelize.Op;

// create a sequelize instance with our local postgres database information.
var sequelize = new Sequelize('postgres://admin:aish@localhost:5432/login');

// setup User model and its fields.
var User = sequelize.define('users', {
    username: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
        primaryKey: true
    },
    email: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
    },
    password: {
        type: Sequelize.STRING,
        allowNull: false
    },
    access_type: {
        type: Sequelize.CHAR(1),
        allowNull: false,
        isIn: [['A', 'G']]

    },
    deleted: {
        type: Sequelize.BOOLEAN ,
        allowNull: false,
        defaultValue: false
    }
}, {
    hooks: {
      beforeCreate: (user) => {
        const salt = bcrypt.genSaltSync();
        user.password = bcrypt.hashSync(user.password, salt);
      }
    } 
});

User.prototype.validPassword = function(password) {
        return bcrypt.compareSync(password, this.password);
      }; 


// create all the defined tables in the specified database.
sequelize.sync()
    .then(() => console.log('users table has been successfully created, if one doesn\'t exist'))
    .catch(error => console.log('This error occured', error));

// export User model for use in other files.
module.exports = User;