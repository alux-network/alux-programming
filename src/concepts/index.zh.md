<!-- reader: {"title":"简介","sourceHash":"sha256:194a77c34127d9a1e9575400d0bddfbda3cbea7bb3d4e51141da9e69c1e64bee"} -->

# 概念导读 {#concepts-introduction}

![Concepts — the programming machinery](/concepts.png)

```admonish tip title="相关内容"
语义视角：[为何含义优先](../denotational-design/semantic-view.md)  
Rust 中的语义驱动设计：[能力代数](../rust-dd/capability-algebras.md)  
洞见：[简介](../insights/index.md)
```

本部分的章节将介绍重要的编程机制与理论工具：

*   操作语义描述执行规则
*   CPS 将控制延续显式化
*   去函数化将已知的高阶行为转为一阶数据
*   自由单子通过顺序组合表示效应语法
*   表达式问题编码用于管理可扩展性
*   引用透明性支持替换
*   合流性、轨迹与双模拟用于比较不同形式的行为

指称设计并未取代这些概念，而是将它们放在合适的位置。

```admonish quote title="机制与含义"
[概念](index.md)与[洞见](../insights/index.md)用于说明实用的编程机制。[指称设计](../denotational-design/design.md)则说明如何判断这些机制应当保留什么。
```

阅读每章时，思考以下三个问题：

1.  这个概念描述的是含义、表示、执行，还是它们之间的某种变换？
2.  它保留了哪些观察与等价关系？
3.  它是规范、规范的一种编码，还是一种解释器？

有几章写于本书采用明确的语义递进结构之前，其示例有意保留了操作层面的侧重。相关页面链接与“洞见”章节会将它们重新连接到语义视角。
