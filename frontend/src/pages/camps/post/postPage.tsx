import { Suspense, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  useMutation,
  useSuspenseQueries,
  useSuspenseQuery,
} from '@tanstack/react-query';
import Modal from '../../../components/modal/modal';
import ImageSlider from '../../../components/slider/imageSlider';
import PostGrid from '../../../components/post/postGrid';
import PostCard from '../../../components/post/postCard';
import Text from '../../../components/text/text';
import { Post } from '../../../types/api/post';
import { Comment } from '../../../types/api/comment';
import Spinner from '../../../components/loading/spinner';
import ModalSipnner from '../../../components/loading/modalSpinner';
import { User } from '../../../types/api/user';
import Image from '../../../components/image/Image';
import LikeButton from '../../../components/button/likeButton';
import { numberToString } from '../../../utils/unit';
import { queryClient } from '../../../main';
import CloseIcon from '../../../assets/icons/closeIcon.svg?react';

interface PostGridTemplateProps {
  handleModalOpen: (postId: string) => void;
}

interface PostModalTemplateProps {
  postId: string | null;
  handleModalClose: () => void;
}

interface CommentProps {
  comment: string;
  createdAt: string;
  profile: User;
}

function PostPage() {
  const [showModal, setModal] = useState(false);
  const [showPostId, setPostId] = useState<string | null>(null);

  const handleModalOpen = (postId: string) => {
    setPostId(postId);
    setModal(true);
  };

  const handleModalClose = () => {
    setPostId(null);
    setModal(false);
  };

  return (
    <section className="relative flex-1">
      {showModal && (
        <Suspense fallback={<ModalSipnner />}>
          <Modal isOpen={showModal} setOpen={handleModalClose}>
            <PostModalTemplate
              postId={showPostId}
              handleModalClose={handleModalClose}
            />
          </Modal>
        </Suspense>
      )}
      <Suspense
        fallback={
          <div className="h-[10rem] w-full">
            <Spinner className="center" />
          </div>
        }
      >
        <PostGridTemplate handleModalOpen={handleModalOpen} />
      </Suspense>
    </section>
  );
}

function PostGridTemplate({ handleModalOpen }: PostGridTemplateProps) {
  const { campId } = useParams();

  const { data: posts } = useSuspenseQuery<Post[]>({
    queryKey: ['posts'],
    queryFn: () => fetch(`/api/posts/camp/${campId}`).then((res) => res.json()),
  });

  return (
    <PostGrid>
      {posts.map((post) => {
        const { postId, images, likeCount, commentCount, content } = post;
        return (
          <PostCard
            imageSrc={images[0]}
            likeCount={likeCount}
            commentCount={commentCount}
            postId={postId}
            handleOnClick={handleModalOpen}
            content={content}
            key={`post-card-${postId}`}
          />
        );
      })}
    </PostGrid>
  );
}

function PostModalTemplate({
  postId,
  handleModalClose,
}: PostModalTemplateProps) {
  const [liked, setLike] = useState<boolean>(false);

  const [post, comments] = useSuspenseQueries({
    queries: [
      {
        queryKey: ['post', postId],
        queryFn: (): Promise<Post> =>
          fetch(`/api/posts/${postId}`).then((res) => res.json()),
        gcTime: 0,
        staleTime: 0,
      },
      {
        queryKey: ['post-comments', postId],
        queryFn: (): Promise<Comment[]> =>
          fetch(`/api/posts/${postId}/comments`).then((res) => res.json()),
        gcTime: 0,
        staleTime: 0,
      },
    ],
  });

  const { data: profile } = useSuspenseQuery({
    queryKey: ['user-profile', post.data?.userId],
    queryFn: (): Promise<User> =>
      fetch(`/api/users/${post.data?.userId}`).then((res) => res.json()),
  });

  const commentProfiles = useSuspenseQueries({
    queries: comments.data.map((comment) => {
      const { userId } = comment;
      return {
        queryKey: ['user-profile', userId],
        queryFn: (): Promise<User> =>
          fetch(`/api/users/${comment.userId}`).then((res) => res.json()),
      };
    }),
  });

  const postLikeMutation = useMutation({
    mutationFn: (like: boolean) =>
      fetch(`/api/posts/${postId}/like`, {
        method: 'put',
        body: JSON.stringify({ like }),
      }).then((res) => res.json()),
    onSuccess: (data) => {
      const { likeCount } = data;
      queryClient.setQueryData(['post', postId], {
        ...post.data,
        likeCount,
      });
      setLike(!liked);
    },
  });

  return (
    <div className="flex h-[31.25rem]">
      {post.data.images.length !== 0 && (
        <div className="w-[37.5rem]">
          <ImageSlider images={post.data.images} />
        </div>
      )}
      <div className="flex w-[17.5rem] flex-col justify-between">
        <div className="cool-scrollbar flex flex-1 flex-col gap-md overflow-y-scroll p-md">
          <div className="flex flex-col gap-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-md">
                <Image
                  src={profile.profileUrl}
                  width={32}
                  height={32}
                  className="rounded-full border-sm border-text-primary"
                />
                <Text size={12}>{profile.userName}</Text>
              </div>
              <button
                type="button"
                aria-label="post modal close button"
                onClick={handleModalClose}
              >
                <CloseIcon />
              </button>
            </div>
            <Text size={14}>{post.data.content}</Text>
            <div className="flex justify-between">
              <LikeButton
                liked={liked}
                onClick={() => {
                  postLikeMutation.mutate(!liked);
                }}
              >
                <Text size={12}>
                  좋아요 {numberToString(post.data.likeCount)}
                </Text>
              </LikeButton>
              <Text size={12} color="text-secondary" className="text-end">
                {post.data.createdAt}
              </Text>
            </div>
          </div>
          <hr className="border-[0] border-b-sm border-contour-primary" />
          <div className="flex flex-col gap-md p-sm">
            <Text size={12}>{comments.data.length}개의 코멘트</Text>
            <ul className="flex flex-col gap-lg">
              {comments.data.map((commentData, index) => {
                const { commentId, comment, createdAt } = commentData;
                return (
                  <CommentCard
                    comment={comment}
                    createdAt={createdAt}
                    profile={commentProfiles[index].data}
                    key={`comment-${commentId}`}
                  />
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentCard({ comment, createdAt, profile }: CommentProps) {
  const { userName, profileUrl } = profile;
  return (
    <li className="gamd flex flex-col gap-sm">
      <div className="flex items-center gap-sm">
        <Image
          src={profileUrl}
          width={24}
          height={24}
          className="border-xs rounded-full border-text-primary"
        />
        <Text size={12}>{userName}</Text>
      </div>
      <Text size={14} weight={300}>
        {comment}
      </Text>
      <Text size={12} color="text-secondary" className="text-end">
        {createdAt}
      </Text>
    </li>
  );
}

export default PostPage;
