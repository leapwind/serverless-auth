import { NowRequest, NowResponse } from "@vercel/node";
import { getSessionByToken } from "../../data/session";
import {
    okRequest,
    statusRequestType,
    statusResponseHeaderContentType,
} from "../../constants";
import { zuluNowIsAfterZuluParse } from "../../utils/helper";
import allowCors from "../../utils/cors";

const status = async (req: NowRequest, res: NowResponse) => {
    // set response status code and header type
    res.statusCode = okRequest;
    res.setHeader("content-type", statusResponseHeaderContentType);

    if (req.method != statusRequestType) {
        res.send({
            message: "invalid request method",
        });
        return;
    }

    if (!req.headers["authorization"]) {
        res.send({
            message: "invalid request header",
        });
        return;
    }

    let authorization = req.headers["authorization"];

    if (!authorization.includes(" ")) {
        res.send({
            message: "invalid authorization syntax",
        });
        return;
    }

    let authorizationSplits = authorization.split(" ");

    let Bearer = authorizationSplits[0];
    let token = authorizationSplits[1];

    if (Bearer != "Bearer") {
        res.send({
            message: "'Bearer' not found in authorization header",
        });
        return;
    }

    const { data, error } = await getSessionByToken(token);

    if (error) {
        res.send({
            message: "error occured while fetching session",
        });
        return;
    }

    if (!data) {
        res.send({
            message: "success",
            status: false,
        });
        return;
    }

    if (zuluNowIsAfterZuluParse(data.expires_at)) {
        res.send({
            message: "success",
            status: false,
        });
        return;
    }

    res.send({
        message: "success",
        status: true,
    });
    return;
};

export default allowCors(status);
