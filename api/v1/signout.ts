import { NowRequest, NowResponse } from "@vercel/node";
import { sessionSignout } from "../../data/session";
import {
    okRequest,
    signoutRequestType,
    signoutResponseHeaderContentType,
} from "../../constants";
import { zuluNow } from "../../utils/helper";
import allowCors from "../../utils/cors";

const signout = async (req: NowRequest, res: NowResponse) => {
    // set response status code and header type
    res.statusCode = okRequest;
    res.setHeader("content-type", signoutResponseHeaderContentType);

    if (req.method != signoutRequestType) {
        res.send({
            message: "invalid request method",
        });
        return;
    }

    if (!req.headers["authorization"]) {
        res.send({
            message: "invalid authorization",
        });
        return;
    }

    let authorization = req.headers["authorization"];

    if (!authorization.includes(" ")) {
        res.send({
            message: "invalid authorization",
        });
        return;
    }

    let authorizationSplits = authorization.split(" ");

    let Bearer = authorizationSplits[0];
    let token = authorizationSplits[1];

    if (Bearer != "Bearer") {
        res.send({
            message: "invalid authorization",
        });
        return;
    }

    let currentTime = zuluNow();

    let obj = { expires_at: currentTime, updated_at: currentTime };

    const { data, error } = await sessionSignout(token, obj);

    if (error) {
        res.send({ message: "Signout Failed" });
        return;
    }

    if (!data) {
        res.send({ message: "Signout Failed" });
        return;
    }

    res.send({ message: "success" });
    return;
};

export default allowCors(signout);
