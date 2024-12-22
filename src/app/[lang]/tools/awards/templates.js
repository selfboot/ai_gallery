export const awardTemplates = {
  certificate: {
    id: 'awards',
    name: '三好学生证书',
    imageUrl: 'https://slefboot-1251736664.file.myqcloud.com/20241222_ai_gallery_awards_001.jpeg',
    width: 1111,
    height: 768,
    textPositions: [
      {
        id: 'name',
        x: 170,
        y: 300,
        fontSize: 20,
        fontFamily: 'SimKai',
        color: '#000000',
        textAnchor: 'start',
        label: '姓名'
      },
      {
        id: 'school',
        x: 921,
        y: 520,
        fontSize: 20,
        fontFamily: 'SimSun',
        color: '#000000',
        textAnchor: 'end',
        label: '学校'
      },
      {
        id: 'date',
        x: 921,
        y: 560,
        fontSize: 20,
        fontFamily: 'SimSun',
        color: '#000000',
        textAnchor: 'end',
        label: '日期'
      },
      {
        id: 'title',
        x: 555.5,
        y: 405,
        fontSize: 70,
        fontFamily: 'SimKai',
        color: '#ff0000',
        textAnchor: 'middle',
        label: '标题',
        defaultValue: '三好学生'
      }
    ]
  }
};

export const presets = {
  student: {
    name: '小明',
    school: 'XX中学',
    date: '2024年1月1日',
    title: '三好学生'
  },
};

export default awardTemplates.certificate;
