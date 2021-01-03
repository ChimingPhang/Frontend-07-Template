学习笔记

proxy双向绑定 实现原理

1、effect的时候先调用一遍函数，然后在get时候设置依赖收集
2、再进行set的时候进行依赖收集的回调调用

cssom操作
1、先保存每个元素range位置
2、找出当前鼠标点最接近的range元素
3、insertNode进行元素置入