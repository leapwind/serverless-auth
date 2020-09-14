import { NowRequest, NowResponse } from "@vercel/node";
import { mailer } from "../../utils/mailer";
import { getUserByEmail, insertOneUser } from "../../data/user";
import {
    getVerificationRequestByUserId,
    insertOneVerificationRequest,
    updateVerificationRequestByPk,
} from "../../data/verificationRequest";
import {
    authRequestHeaderContentType,
    validSigninMode,
    validSignupMode,
    emailRegex,
    okRequest,
    authRequestType,
    verificationRequestExpiryMinutes,
    forProject,
    authResponseHeaderContentType,
} from "../../constants";
import {
    addMinutesToZuluNow,
    zuluNowIsBeforeZuluParse,
    zuluNow,
} from "../../utils/helper";
import allowCors from "../../utils/cors";

const auth = async (req: NowRequest, res: NowResponse) => {
    // set response status code and header type
    res.statusCode = okRequest;
    res.setHeader("content-type", authResponseHeaderContentType);

    // check the request method
    if (req.method != authRequestType) {
        res.send({
            message: "invalid request method",
        });
        return;
    }

    // check request header content_type
    if (req.headers["content-type"] != authRequestHeaderContentType) {
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

    // check email field in request body
    if (!req.body.email || !req.body.mode) {
        res.send({
            message: "required data is missing in request body",
        });
        return;
    }

    // deconstruct required data from request body
    const { email, mode } = req.body;

    // check mode value
    if (req.body.mode != validSigninMode && req.body.mode != validSignupMode) {
        res.send({
            message: "invalid mode in request body",
        });
        return;
    }

    // check email syntax with regex
    if (!emailRegex.test(email)) {
        res.send({
            message: "invalid email syntax in request body",
        });
        return;
    }

    // convert email to lowercase for avoiding case sensitive issues
    const emailLowered = `${email}`.toLowerCase();

    // declare userId
    let userId = null;

    // get user object from db
    const userOutput = await getUserByEmail(emailLowered);
    let user = userOutput.data;
    let userError = userOutput.error;

    // check userError occurence
    if (userError) {
        res.send({
            message: "error occured while fetching user data",
        });
        return;
    }

    if (mode == validSigninMode) {
        // user existence in db
        if (!user) {
            res.send({
                message: "user not found, send request for signup first",
            });
            return;
        }

        // check user is_enabled
        if (!user.is_enabled) {
            res.send({
                message: "user is disabled for suspicious actions",
            });
            return;
        }

        // check completion of user signup verification
        if (!user.email_verified) {
            res.send({
                message: "user cant signin, complete signup verification first",
            });
            return;
        }

        // assign userId
        userId = user.id;
    }

    if (mode == validSignupMode) {
        // check user existence in db
        if (!user) {
            // insert user with just email and remaining with default data
            const insertedUserOutput = await insertOneUser({
                email: emailLowered,
            });
            let insertedUser = insertedUserOutput.data;
            let insertedUserError = insertedUserOutput.error;

            if (insertedUserError) {
                res.send({
                    message: "error occured while inserting user data",
                });
                return;
            }

            // check insertion of user
            if (!insertedUser) {
                res.send({
                    message: "user not inserted",
                });
                return;
            }

            // assign userId
            userId = insertedUser.id;
        } else {
            // check user is_enabled
            if (!user.is_enabled) {
                res.send({
                    message: "user is disabled for suspicious actions",
                });
                return;
            }

            // check user email verified
            if (user.email_verified) {
                res.send({
                    message: "user is already signedup, signin to get access",
                });
                return;
            }

            // assign userId
            userId = user.id;
        }
    }

    // get verification_request object from db
    const verificationRequestOutput = await getVerificationRequestByUserId(
        userId
    );
    let verificationRequest = verificationRequestOutput.data;
    let verificationRequestError = verificationRequestOutput.error;

    if (verificationRequestError) {
        res.send({
            message: "error occured while fetching previous request data",
        });
        return;
    }

    // check verification_request existence in db
    if (verificationRequest) {
        // check previous request expiration
        if (zuluNowIsBeforeZuluParse(verificationRequest.expires_at)) {
            // expire previous verification request
            const updatedVerificationRequestOutput = await updateVerificationRequestByPk(
                verificationRequest.id,
                {
                    updated_at: zuluNow(),
                    expires_at: zuluNow(),
                }
            );

            if (updatedVerificationRequestOutput.error) {
                res.send({
                    message:
                        "error occured while expiring previous verification request",
                });
                return;
            }
        }
    }

    // set verification request expire_at
    const verificationRequestExpiresAt = addMinutesToZuluNow(
        verificationRequestExpiryMinutes
    );

    // insert verification_request with user_id, mode, expires_at and remaining with default data
    const insertedVerificationRequestOutput = await insertOneVerificationRequest(
        {
            user_id: userId,
            mode: mode,
            expires_at: verificationRequestExpiresAt,
        }
    );

    let insertedVerificationRequest = insertedVerificationRequestOutput.data;
    let insertedVerificationRequestError =
        insertedVerificationRequestOutput.error;

    if (insertedVerificationRequestError) {
        res.send({
            message: "error occured while inserting verification request",
        });
        return;
    }

    // check insertion of verification request
    if (!insertedVerificationRequest) {
        res.send({
            message: "verification request not inserted",
        });
        return;
    }

    // assign verification_token
    const token = insertedVerificationRequest.verification_token;
    const pollId = insertedVerificationRequest.poll_id;

    // send email with confirmation link
    const mailerOutput = await mailer(
        email,
        mode,
        `${process.env.serverSite}/api/v1/confirm?email=${email}&mode=${mode}&token=${token}`,
        forProject
    );

    if (mailerOutput.error) {
        res.send({
            message: "Error Occured while sending email",
        });
        return;
    }

    res.send({
        message: "success",
        pollId: pollId,
        email: email,
    });
    return;
};

export default allowCors(auth);
