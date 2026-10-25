const AuditLog = require('../models/AuditLog');

exports.logAudit = (action, entity) => {
  return async (req, res, next) => {
    const originalSend = res.json;
    res.json = function(data) {
      if (req.user) {
        AuditLog.create({
          actor: req.user._id,
          actorRole: req.user.role,
          action,
          entity,
          entityId: data?._id || data?.id || req.params.id,
          before: req.auditBefore,
          after: data,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }).catch(err => console.error('Audit log error:', err));
      }
      originalSend.call(res, data);
    };
    next();
  };
};
