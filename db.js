import mysql from "mysql";

export default function ({
  MYSQL_HOST: host,
  MYSQL_PORT: port,
  MYSQL_DATABASE: database,
  MYSQL_USER: user,
  MYSQL_PASSWORD: password,
}) {
  return new Promise((resolve, reject) => {
    const db = mysql.createConnection({
      host,
      port,
      database,
      user,
      password,
    });

    db.connect((error) => {
      if (error) {
        reject(error);
      } else {
        resolve(db);
      }
    });
  })
};