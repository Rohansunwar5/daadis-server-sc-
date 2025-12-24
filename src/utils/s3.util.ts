import AWS from "aws-sdk";
import config from "../config";
import { InternalServerError } from "../errors/internal-server.error";

export const s3 = new AWS.S3({
  accessKeyId: config.AWS_ACCESS_ID,
  secretAccessKey: config.AWS_SECRET,
  region: config.AWS_REGION,
});

export const uploadProductImageToS3 = async (
  file: Express.Multer.File
) => {
  try {
    const cleanName = file.originalname.replace(/\s+/g, "_");
    const key = `mahaveer-petals/products/${Date.now()}-${cleanName}`;

    await s3.putObject({
      Bucket: config.S3_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }).promise();

    console.log({
        bucket: config.S3_BUCKET_NAME,
        region: config.AWS_REGION,
        key,
    });


    return {
      url: `https://${config.S3_BUCKET_NAME}.s3.${config.AWS_REGION}.amazonaws.com/${key}`,
      key,
      filename: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  } catch (err) {
    console.error("S3 UPLOAD ERROR:", err);
    throw new InternalServerError("Failed to upload product image to S3");
  }
};
