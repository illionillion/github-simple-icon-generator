import { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";
import sharp from "sharp";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const username = req.query.username as string;
  const bgColor = req.query.bgColor as string;

  if (!username) {
    return res.status(400).json({ message: `400 Bad Request.` });
  }

  const github = await fetch(`https://api.github.com/users/${username}`);
  const json: any = await github.json();
  if (!Object.keys(json).includes('avatar_url')) {
    return res.status(400).json({ message: `400 Bad Request.` });
  }
  const icon = await fetch(json.avatar_url);
  const iconBuffer = await icon.arrayBuffer();

  // アイコン画像をリサイズ
  const resizedIconBuffer = await sharp(iconBuffer)
    .resize(100, 100) // 100x100にリサイズ
    .composite([
      {
        input: Buffer.from(
          `<svg><circle cx="50" cy="50" r="50" fill="white"/></svg>`
        ),
        top: 0,
        left: 0,
        blend: "dest-in", // マスキングを適用
      },
    ])
    .png()
    .toBuffer();

  const buffer = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: !!bgColor ? bgColor : { r: 255, g: 100, b: 100, alpha: 0.5 },
    },
  })
    .composite([
      {
        input: resizedIconBuffer, // リサイズしたアイコン画像を使う
        blend: "over",
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();

  res.setHeader("Content-Type", "image/png");
  res.setHeader("Content-Disposition", "inline;");
  res.status(200).send(buffer);
}
