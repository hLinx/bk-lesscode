/**
 * Tencent is pleased to support the open source community by making 蓝鲸智云PaaS平台社区版 (BlueKing PaaS Community Edition) available.
 * Copyright (C) 2017-2018 THL A29 Limited, a Tencent company. All rights reserved.
 * Licensed under the MIT License (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://opensource.org/licenses/MIT
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */

import iamModel from '../model/iam'
import { checkInServer } from '../controller/iam'
import { IAM_ACTION } from '../../shared/constant.js'

const Router = require('koa-router')

const {
    createProject,
    queryProject,
    updateProject,
    deleteProject,
    getTemplateIds,
    favorite,
    checkname,
    projectDetail,
    my,
    getPreviewImg
} = require('../controller/project')

const router = new Router({
    prefix: '/api/project'
})

// /detail 接口在部署页面也会用到，因此这个接口 develop_app, deploy_app 两种权限有一个即可访问
router.use(['/detail'], async (ctx, next) => {
    const id = ['POST', 'PUT', 'DELETE'].includes(ctx.request.method)
        ? (ctx.request.body.id || ctx.request.body.projectId)
        : (ctx.request.query.id || ctx.request.query.projectId)

    const project = await iamModel.queryProjectByCreatorAndProjectId(ctx.session.userInfo.username, id)
    if (!project) {
        ctx.send({
            code: 404,
            message: '项目不存在',
            data: null
        })
        return
    }

    // 需要去权限中心查询是否具有 develop_app, deploy_app, manage_perms_in_app, manage_app 权限
    const iamRes = await checkInServer(ctx, String(id))
    // develop_app, deploy_app 均无权限
    if (!iamRes[IAM_ACTION.develop_app[0]] && !iamRes[IAM_ACTION.deploy_app[0]]) {
        ctx.send({
            code: 403,
            message: '没有权限，请去权限中心申请权限',
            data: {
                pass: false,
                applyUrl: iamRes.applyUrl,
                requiredPermissions: iamRes.requiredPermissions,
                permissionType: 'page'
            }
        })
        return
    }
    await next()
})

router.use(['/update', '/delete', '/favorite', '/delete'], async (ctx, next) => {
    const id = ['POST', 'PUT', 'DELETE'].includes(ctx.request.method)
        ? (ctx.request.body.id || ctx.request.body.projectId)
        : (ctx.request.query.id || ctx.request.query.projectId)

    const project = await iamModel.queryProjectByCreatorAndProjectId(ctx.session.userInfo.username, id)
    if (!project) {
        ctx.send({
            code: 404,
            message: '项目不存在',
            data: null
        })
        return
    }

    // 需要去权限中心查询是否具有 develop_app 权限
    const iamRes = await checkInServer(ctx, String(id))
    // develop_app 无权限
    if (!iamRes[IAM_ACTION.develop_app[0]]) {
        ctx.send({
            code: 403,
            message: '没有权限，请去权限中心申请权限',
            data: {
                pass: false,
                applyUrl: iamRes.applyUrl,
                requiredPermissions: iamRes.requiredPermissions,
                permissionType: 'page'
            }
        })
        return
    }
    await next()
})

router.post('/create', createProject)
router.get('/query', queryProject)
router.get('/previewimg', getPreviewImg)
router.put('/update', updateProject)
router.delete('/delete', deleteProject)
router.post('/favorite', favorite)
router.post('/checkname', checkname)
router.get('/detail', projectDetail)
router.get('/my', my)
router.get('/getTemplateIds', getTemplateIds)

module.exports = router
