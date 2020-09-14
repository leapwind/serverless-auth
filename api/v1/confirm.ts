import { NowRequest, NowResponse } from "@vercel/node";
import {
    getVerificationRequestByToken,
    updateVerificationRequestByPk,
} from "../../data/verificationRequest";
import {
    validSignupMode,
    validSigninMode,
    emailRegex,
    confirmRequestType,
    okRequest,
    confirmResponseHeaderContentType,
} from "../../constants";
import { updateUserByPk } from "../../data/user";
import { insertOneSession } from "../../data/session";
import { signJWToken } from "../../utils/jwt";
import { zuluNow, zuluNowIsAfterZuluParse } from "../../utils/helper";
import allowCors from "../../utils/cors";

const confirm = async (req: NowRequest, res: NowResponse) => {
    // set response status code and header type
    res.statusCode = okRequest;
    res.setHeader("content-type", confirmResponseHeaderContentType);

    // check the request method
    if (req.method != confirmRequestType) {
        res.send({
            message: "invalid request method",
        });
        return;
    }

    // check for required data in request query
    if (!req.query.email || !req.query.token || !req.query.mode) {
        res.send({
            message: "invalid request method",
        });
        return;
    }

    // deconstruct required data from request query
    const { email, mode, token } = req.query;

    // check mode value
    if (mode != validSignupMode && mode != validSigninMode) {
        res.send({
            message: "invalid mode",
        });
        return;
    }

    // check email syntax with regex
    if (!emailRegex.test(email.toString())) {
        res.send({
            message: "invalid email syntax",
        });
        return;
    }

    const emailLowered = `${email}`.toLowerCase();

    // declare userId
    let userId = null;

    let user = null;

    let verifyUserEmail = false;

    // declare verificationId
    let verificationId = null;

    // get verification_request object from db
    const verificationRequestOutput = await getVerificationRequestByToken(
        token
    );
    let verificationRequest = verificationRequestOutput.data;
    let verificationRequestError = verificationRequestOutput.error;

    if (verificationRequestError) {
        res.send({
            message: "error occured while fetching verification request",
        });
        console.log(
            "/confirm",
            "error occured while fetching verification request"
        );
        return;
    }

    // check verification_request existence in db
    if (!verificationRequest) {
        res.send({
            message: "request not found",
        });
        return;
    }

    verificationId = verificationRequest.id;
    user = verificationRequest.user;
    userId = user.id;

    // check mode of verification mode
    if (mode != verificationRequest.mode) {
        res.send({
            message: "request mode is not similar",
        });
        return;
    }

    // check request expiration
    if (zuluNowIsAfterZuluParse(verificationRequest.expires_at)) {
        res.send({
            message: "request is expired",
        });
        return;
    }

    // check request verification
    if (verificationRequest.is_verified) {
        res.send({
            message: "request is already verified",
        });
        return;
    }

    // check email of verification_request user
    if (emailLowered != user.email) {
        res.send({
            message: "email not same",
        });
        return;
    }
    // check user is_enabled
    if (!user.is_enabled) {
        res.send({
            message: "user is disabled",
        });
        return;
    }

    // check signin mode
    if (mode == validSigninMode) {
        // check email_verified
        if (!user.email_verified) {
            res.send({
                message: "email not verified",
            });
            return;
        }
    }

    // check signup mode
    if (mode == validSignupMode) {
        // check email_verified
        if (user.email_verified) {
            res.send({
                message: "email is already verified",
            });
            return;
        } else {
            // set email_verified of user as true
            verifyUserEmail = true;
        }
    }

    // set current utc time
    let currentTime = zuluNow();

    // update verification_request expires_at, updated_at, and is_verified
    const updatedVerificationRequestOutput = await updateVerificationRequestByPk(
        verificationId,
        {
            updated_at: currentTime,
            is_verified: true,
        }
    );
    let updatedVerificationRequest = updatedVerificationRequestOutput.data;
    let updatedVerificationRequestError =
        updatedVerificationRequestOutput.error;

    if (updatedVerificationRequestError) {
        res.send({
            message: "error occured while updating verification request",
        });
        console.log(
            "/confirm",
            "error occured while updating verification request"
        );
        return;
    }

    // check verification request update
    if (!updatedVerificationRequest) {
        res.send({
            message: "verification request not updated",
        });
        return;
    }

    // assign updated value to verification request
    verificationRequest = updatedVerificationRequest;
    user = verificationRequest.user;

    // check email verified for signup mode
    if (verifyUserEmail) {
        // set current utc time
        currentTime = zuluNow();

        // update user updated_at, email_verified
        const updatedUserOutput = await updateUserByPk(userId, {
            updated_at: currentTime,
            email_verified: verifyUserEmail,
        });
        let updatedUser = updatedUserOutput.data;
        let updatedUserError = updatedUserOutput.error;

        if (updatedUserError) {
            res.send({
                message: "error occured while updating user",
            });
            return;
        }

        if (!updatedUser) {
            res.send({
                message: "user not updated",
            });
            return;
        }

        user = updatedUser;
    }

    // generate jwt token with jose
    const { JWToken, sessionExpiresAt } = signJWToken(email, user);

    // insert session with user_id, token, expires_at and remaining with default values
    const insertedSessionOutput = await insertOneSession({
        user_id: userId,
        request_id: verificationId,
        token: JWToken,
        expires_at: sessionExpiresAt,
    });
    let insertedSession = insertedSessionOutput.data;
    let insertedSessionError = insertedSessionOutput.error;

    if (insertedSessionError) {
        res.send({
            message: "error occured while inserting session",
        });
        return;
    }

    // check session insertion
    if (!insertedSession) {
        res.send({
            message: "session not inserted",
        });
        return;
    }

    res.send({
        message: "success",
    });
    return;
};

export default allowCors(confirm);
