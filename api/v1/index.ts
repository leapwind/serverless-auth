import { NowRequest, NowResponse } from "@vercel/node";
import { okRequest, indexResponseHeaderContentType } from "../../constants";
import allowCors from "../../utils/cors";

const index = async (req: NowRequest, res: NowResponse) => {
    // set response status code and header type
    res.statusCode = okRequest;
    res.setHeader("content-type", indexResponseHeaderContentType);

    res.send({
        message: "success",
    });
};

export default allowCors(index);
