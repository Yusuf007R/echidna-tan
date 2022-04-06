import { NextFunction, Request, Response } from 'express';
import MusicPlayer from '../../../structures/music-player';

export type middleware = (req: Request, res: Response, next: NextFunction) => void;

export type middlewareError = (err: Error, req: Request, res: Response, next: NextFunction) => void;

declare module 'express-serve-static-core' {
  interface Request {
    guildPlayer: MusicPlayer;
  }
}
