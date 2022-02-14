import Nodes from './Nodes.js';
import Breadcrumb from './Breadcrumb.js';
import ImageView from './ImageView.js';
import { request } from './api.js';
import Loading from './Loading.js';

const cache = {};

export default function App($app) {
  this.state = {
    isRoot: true,
    nodes: [],
    depth: [],
    selectedFilePath: null,
    isLoading: true,
  };

  const breadcrumb = new Breadcrumb({
    $app,
    initialState: this.state.depth,
    onClick: (index) => {
      if (index === null) {
        this.setState({
          ...this.state,
          depth: [],
          nodes: cache.root,
        });
        return;
      }

      if (index === this.state.depth.length - 1) {
        return;
      }

      const nextState = { ...this.state };
      const nextDepth = this.state.depth.slice(0, index + 1);

      this.setState({
        ...nextState,
        depth: nextDepth,
        nodes: cache[nextDepth[nextDepth.length - 1].id],
      });
    },
  });

  const imageView = new ImageView({
    $app,
    initialState: this.state.selectedNodeImage,
    CloseImage: () => {
      this.setState({ ...this.state, selectedFilePath: null });
    },
  });

  const nodes = new Nodes({
    $app,
    initialState: {
      isRoot: this.state.isRoot,
      nodes: this.state.nodes,
    },
    onClick: async (node) => {
      try {
        if (node.type === 'DIRECTORY') {
          if (cache[node.id]) {
            this.setState({
              ...this.state,
              depth: [...this.state.depth, node],
              nodes: cache[node.id],
              isRoot: false,
            });
          } else {
            const nextNodes = await request(node.id);

            this.setState({
              ...this.state,
              depth: [...this.state.depth, node],
              nodes: nextNodes,
              isRoot: false,
            });
            cache[node.id] = nextNodes;
          }
        } else if (node.type === 'FILE') {
          this.setState({
            ...this.state,
            selectedFilePath: node.filePath,
          });
        }
      } catch (e) {
        console.log('에러!!');
      }
    },

    onBackClick: async () => {
      try {
        const nextState = { ...this.state };
        nextState.depth.pop();
        const prevNodeId =
          nextState.depth.length === 0
            ? null
            : nextState.depth[nextState.depth.length - 1].id;

        if (prevNodeId === null) {
          //   const rootNodes = await request()
          this.setState({
            ...nextState,
            isRoot: true,
            //   nodes:rootNodes
            nodes: cache.root,
          });
        } else {
          const prevNodes = await request(prevNodeId);

          this.setState({
            ...nextState,
            isRoot: false,
            //   nodes:prevNodes,
            nodes: cache[prevNodeId],
          });
        }
      } catch (e) {}
    },
    // 함수를 파라메터로 던지고, Nodes 내에서 click 발생시 이 함수를 호출하게 함.
    // 이러면 Nodes 내에선 click 후 어떤 로직이 일어날지 알아야 할 필요가 없음.
  });

  const loading = new Loading($app, this.state.isLoading);

  // App 컴포넌트에도 setState 함수 정의하기
  this.setState = (nextState) => {
    this.state = nextState;
    breadcrumb.setState(this.state.depth);
    nodes.setState({
      isRoot: this.state.isRoot,
      nodes: this.state.nodes,
    });
    imageView.setState(this.state.selectedFilePath);
    loading.setState(this.state.isLoading);
  };

  const init = async () => {
    try {
      this.setState({
        ...this.state,
        isLoading: true,
      });
      const rootNodes = await request();
      this.setState({
        ...this.state,
        isRoot: true,
        nodes: rootNodes,
      });

      cache.root = rootNodes;
    } catch (e) {
      // 에러처리 하기
      console.log('request에러');
      console.log(e);
    } finally {
      this.setState({
        ...this.state,
        isLoading: false,
      });
    }
  };

  init();
}
