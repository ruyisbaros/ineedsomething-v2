import express, { Router, Response, Request } from "express";
import moment from "moment";
import axios from "axios";
import { performance } from "perf_hooks";
import HTTP_STATUS from "http-status-codes";
import { config } from "./../../config";

class HealthRoutes {
  private router: Router;

  constructor() {
    this.router = express.Router();
  }

  public health(): Router {
    this.router.get("/health", (req: Request, res: Response) => {
      res.status(HTTP_STATUS.OK).send(`Health: Server instance is running healthy with process id ${process.pid} on ${moment().format("LL")} amk olsun yaaa`);
    });
    return this.router;
  }
  public env(): Router {
    this.router.get("/env", (req: Request, res: Response) => {
      res.status(HTTP_STATUS.OK).send(`This is the ${config.NODE_ENV} environment`);
    });
    return this.router;
  }

  public instance(): Router {
    this.router.get("/instance", async (req: Request, res: Response) => {
      const response = await axios.get(`${config.EC2_URL}`);
      res
        .status(HTTP_STATUS.OK)
        .send(`Server is running on EC2 instance with id:  ${response.data} and process id: ${process.pid} on ${moment().format("LL")}`);
    });
    return this.router;
  }

  public fiboRoutes(): Router {
    this.router.get("/fibo/:num", async (req: Request, res: Response) => {
      const { num } = req.params;
      const start: number = performance.now();
      const result: number = this.fiBo(parseInt(num, 10));
      const end: number = performance.now();
      const response = await axios.get(`${config.EC2_URL}`);
      res
        .status(HTTP_STATUS.OK)
        .send(
          `Fibonacci series of ${num} is ${result} and it took ${end - start} ms with EC2 instance of  ${response.data} and process id: ${
            process.pid
          } on ${moment().format("LL")}`
       );

      res
        .status(HTTP_STATUS.OK)
        .send(`Fibonacci series of ${num} is ${result} and it took ${end - start} ms and process id: ${process.pid} on ${moment().format("LL")}`);
    });
    return this.router;
  }

  private fiBo(data: number): number {
    if (data < 2) {
      return 1;
    } else {
      return this.fiBo(data - 2) + this.fiBo(data - 1);
    }
  }
}

export const healthRoutes: HealthRoutes = new HealthRoutes();
