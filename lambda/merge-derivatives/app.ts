import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { downloadDerivatives } from './modules/autodesk';
import { uploadFile } from './modules/aws';
import { zipFiles } from './modules/zip';


/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

export interface DownloadObject {
    name: string;
    url: string;
    'CloudFront-Policy': string;
    'CloudFront-Key-Pair-Id': string;
    'CloudFront-Signature': string;
}

export interface Derivative {
    guid: string;
    mime: string;
    role: string;
    status: string;
    type: string;
    urn: string;
}

export interface APSDerivativesZipInput {
    urn: string;
    derivatives: string[];
    token: string;
}

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
// Check if the request is a preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Headers" : "Content-Type",
        "Access-Control-Allow-Origin": "*", // Required for CORS support to work
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
      },
      body: JSON.stringify({ message: 'Preflight request' })
    };
  }

    let urn: string;
    let derivatives: string[];
    let token: string;

    console.log('Paylaod is:', event, typeof event);
    
    if(event && !event.body){
      ({ urn, derivatives, token } = event as unknown as APSDerivativesZipInput);
    }else if(event.body){
      ({ urn, derivatives, token } = JSON.parse(event.body) as unknown as APSDerivativesZipInput);
    }else{
      return { statusCode: 400, body: JSON.stringify({ message: 'Missing payload' }) };
    }

    //If no urn, derivatives or token, return 400
    if(!urn || !derivatives || !token) return { statusCode: 400, body: JSON.stringify({ message: 'Missing parameters' }) };

    const path = "/tmp/";
    const filesNames: string[] = await downloadDerivatives(path, urn, derivatives, token);

    //If no filesNames, return 400
    if(!filesNames || filesNames.length === 0) return { statusCode: 400, body: JSON.stringify({ message: 'No derivatives found' }) };
    
    const bucket = 'shl-bim-360-derivatives';
    const outputName = 'output.zip';

    await zipFiles(filesNames, path, outputName);
    // await mergePdfs(filesNames, outputPath)

    const presignedUrl = await uploadFile(bucket, path, outputName);
    
    if(!presignedUrl) return { statusCode: 400, body: JSON.stringify({ message: 'No presignedUrl found' }) };

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            "Access-Control-Allow-Headers" : "Content-Type",
            "Access-Control-Allow-Origin": "*", // Required for CORS support to work
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
     },
        body: JSON.stringify({url: presignedUrl}),
    };
};





