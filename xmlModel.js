const fs = require('fs');
const xml2js = require('xml2js');
const path = require('path');

const chatFilePath = path.join(__dirname, '../data/chat.xml');
const groupsFilePath = path.join(__dirname, '../data/groups.xml');

const builder = new xml2js.Builder();
const parser = new xml2js.Parser({ explicitArray: false });

if (!fs.existsSync(path.join(__dirname, '../data'))) {
    fs.mkdirSync(path.join(__dirname, '../data'));
}


exports.saveMessage = (data) => {
    let xmlData = fs.existsSync(chatFilePath) ? fs.readFileSync(chatFilePath, 'utf8') : "";
    parser.parseString(xmlData, (err, result) => {
        if (err || !result) result = { messages: { message: [] } };
        if (!result.messages.message) result.messages.message = [];
        if (!Array.isArray(result.messages.message)) result.messages.message = [result.messages.message];

        result.messages.message.push({
            user: data.user.toLowerCase().trim(),
            text: data.text,
            group: data.group,
            time: new Date().toLocaleString()
        });
        fs.writeFileSync(chatFilePath, builder.buildObject(result));
    });
};

exports.getMessages = (callback) => {
    if (!fs.existsSync(chatFilePath)) return callback([]);
    parser.parseString(fs.readFileSync(chatFilePath, 'utf8'), (err, result) => {
        if (err || !result || !result.messages.message) return callback([]);
        const msgs = Array.isArray(result.messages.message) ? result.messages.message : [result.messages.message];
        callback(msgs);
    });
};


exports.saveGroup = (groupName, adminEmail) => {
    let result = { groups: { group: [] } };
    const admin = adminEmail.toLowerCase().trim();
    if (fs.existsSync(groupsFilePath)) {
        let data = fs.readFileSync(groupsFilePath, 'utf8');
        parser.parseString(data, (err, res) => { if(res) result = res; });
    }
    if (!result.groups.group) result.groups.group = [];
    if (!Array.isArray(result.groups.group)) result.groups.group = [result.groups.group];

    result.groups.group.push({
        name: groupName,
        admin: admin,
        members: { member: [admin] },
        pending: { request: [] }
    });
    fs.writeFileSync(groupsFilePath, builder.buildObject(result));
};

exports.getGroups = (callback) => {
    if (!fs.existsSync(groupsFilePath)) return callback([]);
    parser.parseString(fs.readFileSync(groupsFilePath, 'utf8'), (err, result) => {
        if (err || !result || !result.groups.group) return callback([]);
        let groups = Array.isArray(result.groups.group) ? result.groups.group : [result.groups.group];
        
        groups.forEach(g => {
            if (!g.members) g.members = { member: [] };
            if (!Array.isArray(g.members.member)) g.members.member = g.members.member ? [g.members.member] : [];
            if (!g.pending) g.pending = { request: [] };
            if (!Array.isArray(g.pending.request)) g.pending.request = g.pending.request ? [g.pending.request] : [];
            g.admin = String(g.admin).toLowerCase().trim();
        });
        callback(groups);
    });
};


exports.deleteGroup = (groupName, adminEmail, callback) => {
    const admin = adminEmail.toLowerCase().trim();
    
 
    parser.parseString(fs.readFileSync(groupsFilePath, 'utf8'), (err, result) => {
        if (!err && result && result.groups.group) {
            let groups = Array.isArray(result.groups.group) ? result.groups.group : [result.groups.group];
            result.groups.group = groups.filter(g => !(g.name === groupName && g.admin === admin));
            fs.writeFileSync(groupsFilePath, builder.buildObject(result));
        }

      
        if (fs.existsSync(chatFilePath)) {
            parser.parseString(fs.readFileSync(chatFilePath, 'utf8'), (err2, chatResult) => {
                if (!err2 && chatResult && chatResult.messages && chatResult.messages.message) {
                    let msgs = Array.isArray(chatResult.messages.message) ? chatResult.messages.message : [chatResult.messages.message];
                    chatResult.messages.message = msgs.filter(m => m.group !== groupName);
                    fs.writeFileSync(chatFilePath, builder.buildObject(chatResult));
                }
                callback();
            });
        } else {
            callback();
        }
    });
};


exports.addRequest = (groupName, userEmail, callback) => {
    const email = userEmail.toLowerCase().trim();
    parser.parseString(fs.readFileSync(groupsFilePath, 'utf8'), (err, result) => {
        let groups = Array.isArray(result.groups.group) ? result.groups.group : [result.groups.group];
        let group = groups.find(g => g.name === groupName);
        if (group) {
            if (!group.pending) group.pending = { request: [] };
            let requests = Array.isArray(group.pending.request) ? group.pending.request : (group.pending.request ? [group.pending.request] : []);
            if (!requests.includes(email)) {
                requests.push(email);
                group.pending.request = requests;
                fs.writeFileSync(groupsFilePath, builder.buildObject(result));
                if(callback) callback();
            }
        }
    });
};

exports.approveMember = (groupName, userEmail, callback) => {
    const email = userEmail.toLowerCase().trim();
    parser.parseString(fs.readFileSync(groupsFilePath, 'utf8'), (err, result) => {
        let groups = Array.isArray(result.groups.group) ? result.groups.group : [result.groups.group];
        let group = groups.find(g => g.name === groupName);
        if (group) {
            let requests = Array.isArray(group.pending.request) ? group.pending.request : [group.pending.request];
            group.pending.request = requests.filter(e => e !== email);
            let members = Array.isArray(group.members.member) ? group.members.member : [group.members.member];
            if (!members.includes(email)) members.push(email);
            group.members.member = members;
            fs.writeFileSync(groupsFilePath, builder.buildObject(result));
            callback();
        }
    });
};