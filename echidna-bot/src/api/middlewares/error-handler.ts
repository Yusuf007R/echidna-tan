import { CustomException } from '../utils/exception';
import { middlewareError } from './dto';

const errorHandler: middlewareError = function (err: CustomException, req, res, next) {
  res.status(err.code).json({ error: err.message } || { error: 'Internal server error' });
};

export default errorHandler;
