const eventEmitter=require('events');
const whenFinish=new eventEmitter();

const mysql=require('mysql');
const client = mysql.createConnection({
	host: 'localhost', // DB서버 IP주소
	port: 3306, // DB서버 Port주소
	user: '2019pprj', // DB접속 아이디
	password: 'pprj2019', // 암호
    database: 'db2019', //사용할 DB명
    multipleStatements: true
});

client.connect((error)=>{
    if(error){
        console.log("connect error!!!", error);
    }
    else
        console.log("connect sucess!!!");
});

whenFinish.on('finish', (item)=>{
    //console.log('item', item);
    const promise=new Promise((resolve, reject)=>{
        const sql=`update t1_goods set status=\'finish\' where goo_id=${item.goo_id};`;
        client.query(sql, (error, result)=>{
            if(error){
                reject('sql error');
            }
            else{
                console.log('result', result);
                resolve(item);
            }
        });
    });
    promise
        .then((item)=>{
            return new Promise((resolve, reject)=>{
                const obj={};
                obj.item_id=item.goo_id;

                const sql2=`select * from t1_deal where goo_id=${item.goo_id};`;
                client.query(sql2, (error, result)=>{
                    if(error){
                        reject('sql2 error');
                    }
                    else{
                        console.log('result2', result);
                        obj.result=result;

                        resolve(obj);
                    }
                });
            });
        })
        .then((obj)=>{
            return new Promise((resolve, reject)=>{
                console.log('2nd then result', obj.result);

                let bottom=0;

                obj.result.forEach((record, index)=>{
                    bottom+=record.invest_coin;

                    if(index==obj.result.length-1){
                        obj.bottom=bottom;

                        resolve(obj);
                    }
                });
            });
        })
        .then((obj)=>{
            return new Promise((resolve, reject)=>{
                const sql5=`select buyer_id, sum(invest_coin)total from t1_deal where goo_id=${obj.item_id} group by buyer_id;`
                client.query(sql5, (error, result)=>{
                    if(error)
                        reject('sql5 error');
                    else{
                        console.log('result5', result);
                        obj.tops=result;

                        resolve(obj);
                    }
                });
            });
        })
        .then((obj)=>{
            return new Promise((resolve, reject)=>{
                const percentages=[];

                obj.tops.forEach((top, i)=>{
                    const p=Math.ceil((top.total/obj.bottom)*100);
                    percentages.push(p);

                    if(i==obj.tops.length-1){
                        obj.percentages=percentages;

                        resolve(obj);
                    }
                })
            })
        })
        .then((obj)=>{
            return new Promise((resolve, reject)=>{
                console.log('percentages', obj.percentages);
                const pool=[];

                obj.tops.forEach((top, index)=>{
                    for(let i=0;i<obj.percentages[index];i++){
                        pool.push(top.buyer_id);
                    }
                });

                obj.pool=pool;
                resolve(obj);
            })
        })
        .then((obj)=>{
            return new Promise((resolve, reject)=>{
                console.log('pool', obj.pool[0], obj.pool.length);

                function getRandomInt(min, max){
                    min = Math.ceil(min);
                    max = Math.floor(max);
                    
                    return Math.floor(Math.random() * (max - min)) + min; //최댓값은 제외, 최솟값은 포함
                };
    
                const i=getRandomInt(0, obj.pool.length);
                console.log(i);
                console.log(obj.pool[i]);
                obj.winner=obj.pool[i];

                resolve(obj);
            });
        })
        .then((obj)=>{
            return new Promise((resolve, reject)=>{
                const sql3=`update t1_deal set status='win' where buyer_id=\'${obj.winner}\' and goo_id=${obj.item_id};`;
                client.query(sql3, (error, result)=>{
                    if(error)
                        reject('sql3 error');
                    else{
                        console.log(result);
    
                        resolve(obj);
                    }
                });
            })
        })
        .then((obj)=>{
            const sql4=`update t1_deal set status='lose' where buyer_id!=\'${obj.winner}\' and goo_id=${obj.item_id};`;
            client.query(sql4, (error, result)=>{
                if(error)
                    reject('sql4 error');
                else{
                    console.log(result);
                }
            })
        })
        .catch((error)=>{
            console.log(error);
        });
});

const calcTime=(req, res)=>{
    const leftTime=new Array();
    const currentTime=new Date();   //UTC현재 시간
    //console.log('current', Math.floor(currentTime.getTime()/1000)*1000);

    //*UTC시간을 그냥 문자열로 바꾸면 KST시간으로 자동으로 바뀐다. 주의가 필요!!!
    req.session.items.forEach((time)=>{
        let endTime=new Date(time.time_year, time.time_month-1, time.time_day,
            time.time_hour, time.time_minute); //UTC끝나는 시간-1일
        
        if(Math.floor(currentTime.getTime()/100)*100==Math.floor(endTime/100)*100){
            //console.log(time);

            whenFinish.emit('finish', time);
        }
        else if(Math.floor(currentTime.getTime()/1000)*1000<Math.floor(endTime/1000)*1000){
            const temp=new Date(endTime-currentTime.getTime()).toUTCString().split(' ');

            leftTime.push(time.goo_id+':'+temp[1]+':'+temp[4]);
        }
        else if(Math.floor(currentTime.getTime()/1000)*1000>Math.floor(endTime/1000)*1000){
            leftTime.push(time.goo_id+':01:00:00:00');
        }
    });
    
    res.end(JSON.stringify(leftTime));
}

module.exports=calcTime;