<template>
    <draw-layout :hide-right-slot="navEmpty">
        <layout>
            <div class="markdown-page-wrapper">
                <mavon-editor style="height: 100%" v-model="localValue" ref="md" @imgAdd="uploadImg" :tool-bars="toolbarsSetting" />
            </div>
        </layout>
        <div v-if="!navEmpty" class="markdown-setting-wrapper" slot="right">
            <layout-setting :template-data="curTemplateData" />
        </div>
    </draw-layout>
</template>
<script>
    import DrawLayout from '@/views/index/components/draw-layout'
    import Layout from '@/components/render/pc/widget/layout'
    import LayoutSetting from '@/element-materials/modifier/template'
    import { mapGetters } from 'vuex'

    export default {
        name: 'markdown',
        components: {
            DrawLayout,
            Layout,
            LayoutSetting
        },
        data () {
            return {
                localValue: '',
                toolbarsSetting: {
                    bold: true,
                    italic: true,
                    header: true,
                    underline: true,
                    strikethrough: true,
                    mark: true,
                    superscript: true,
                    subscript: true,
                    quote: true,
                    ol: true,
                    ul: true,
                    link: true,
                    imagelink: true,
                    code: true,
                    table: true,
                    fullscreen: true,
                    readmodel: true,
                    htmlcode: true,
                    help: true,
                    undo: true,
                    redo: true,
                    trash: true,
                    save: false,
                    navigation: true,
                    alignleft: true,
                    aligncenter: true,
                    alignright: true,
                    subfield: true,
                    preview: true
                }
            }
        },
        computed: {
            ...mapGetters('layout', ['pageLayout']),
            ...mapGetters('drag', ['curTemplateData']),
            ...mapGetters('page', ['pageDetail']),
            navEmpty () {
                return this.pageLayout.layoutType === 'empty'
            }
        },
        watch: {
            localValue (val) {
                this.$store.commit('nocode/markdown/setMdContent', val)
            }
        },
        created () {
            const pageContentObj = this.pageDetail.content || {}
            this.localValue = pageContentObj?.content || ''
            this.$store.commit('nocode/markdown/setMdContent', this.localValue)
        },
        methods: {
            uploadImg (pos, $file) {
                // 将图片上传到服务器
                const data = {
                    fileObj: {
                        name: $file._name,
                        content: $file.miniurl
                    },
                    projectId: this.$route.params.projectId
                }
                this.$http.post('/file/uploadBase64Img', data).then((res) => {
                    // 第二步.将返回的url替换到文本原位置![...](0) -> ![...](url)
                    this.$refs.md.$img2Url(pos, res.data?.url)
                })
            }
        }
    }
</script>
<style lang="postcss">
    .markdown-page-wrapper {
        padding: 24px;
        height: 100%;
        min-height: calc(100vh - 190px);
        background: #ffffff;
    }
    .markdown-setting-wrapper{
      height: 100%;
    }
</style>
