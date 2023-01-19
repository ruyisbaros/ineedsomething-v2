import { authWorker } from '../../workers/auth.worker';
import { IAuthJob } from '../../../features/interfaces/auth.interfaces';
import { BaseQueue } from "./base.queue";

class AuthQueue extends BaseQueue {
    constructor() {
        super("auth");
        this.processJob("addNewAuth", 5, authWorker.addAuthToDb)

    }

    public addAuthUserJob(name: string, data: IAuthJob): void {
        this.addJob(name, data);
    }

}

export const authQueue: AuthQueue = new AuthQueue();