const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Please correct the highlighted input.',
      errors: errors.array().map(({ path, msg }) => ({ field: path, message: msg }))
    });
  }
  next();
}

module.exports = validate;
