import { NowRequest, NowResponse } from "@vercel/node";
import { getVerificationRequestByPollId } from "../../data/verificationRequest";

import { getSessionByRequestId } from "../../data/session";
import {
    okRequest,
    verifyRequestType,
    verifyRequestHeaderContentType,
    verifyResponseHeaderContentType,
} from "../../constants";
import { zuluNowIsAfterZuluParse } from "../../utils/helper";
import allowCors from "../../utils/cors";

const verify = async (req: NowRequest, res: NowResponse) => {
    // set response status code and header type
    res.statusCode = okRequest;
    res.setHeader("content-type", verifyResponseHeaderContentType);

    if (req.method != verifyRequestType) {
        res.send({
            message: "invalid request method",
        });
        return;
    }

    if (req.headers["content-type"] != verifyRequestHeaderContentType) {
        res.send({
            message: "invalid request header content-type",
        });
        return;
    }

    // check request body data
    if (!req.body) {
        res.send({
            message: "got empty request body",
        });
        return;
    }

    if (!req.body.pollId) {
        res.send({
            message: "required data is missing in request body",
        });
        return;
    }

    const { pollId } = req.body;

    const { data, error } = await getVerificationRequestByPollId(pollId);

    if (error) {
        res.send({
            message: "Error occured while fetching verifiction request",
        });
        return;
    }

    if (!data) {
        res.send({ message: "verification request not found" });
        return;
    }

    if (zuluNowIsAfterZuluParse(data.expires_at)) {
        res.send({
            message: "success",
            verification_status: "Expired",
            token: null,
        });
        return;
    }

    if (!data.is_verified) {
        res.send({
            message: "success",
            verification_status: "Pending",
            token: null,
        });
        return;
    }

    const sessionOutput = await getSessionByRequestId(data.id);
    let session = sessionOutput.data;
    let sessionError = sessionOutput.error;

    if (sessionError) {
        res.send({ message: "Error occured while fetching session" });
        return;
    }

    if (!session) {
        res.send({ message: "no session found" });
        return;
    }

    if (zuluNowIsAfterZuluParse(session.expires_at)) {
        res.send({ message: "session expired" });
        return;
    }

    res.send({
        message: "success",
        verification_status: "Verified",
        token: session.token,
    });
    return;
};

export default allowCors(verify);
